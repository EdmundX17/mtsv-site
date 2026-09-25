import React, { useState, useMemo, useEffect } from 'react';
import { useValueList } from '../context/ValueListContext';
import { ItemCategory, ItemRarity, PriceTrend, MilitaryItem } from '../types';
import { 
  getRarityConfig, 
  getTrendConfig, 
  getDemandDescription,
  isVehicleCategory, 
  isSoldierOrDroneCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS
} from '../utils/formatters';
import { getSafeImageUrl } from '../utils/imageOptimizer';
import { 
  Zap, 
  Sliders, 
  Check, 
  X, 
  Search, 
  AlertTriangle, 
  Star, 
  CheckSquare, 
  Square, 
  Sparkles,
  RotateCcw,
  TrendingUp,
  Percent,
  CheckCircle2,
  ListFilter,
  ShieldAlert,
  ShieldOff,
  Users,
  Bot,
  Calendar,
  Clock,
  Activity,
  ArrowUpRight,
  Tag,
  Radio,
  Eye,
  EyeOff,
  Send,
  Lock,
  Link,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { hasItemPriceChanges } from '../utils/historyHelper';

const ALL_RARITIES: ItemRarity[] = [
  'Limited Edition',
  'Exotic',
  'Legendary',
  'Epic',
  'Rare',
  'Common'
];

const ALL_CATEGORIES: (ItemCategory | 'All')[] = [
  'All',
  'Air',
  'Land',
  'Naval',
  'Soldier',
  'Drone',
  'Tags',
  'Other'
];

interface StarTierOption {
  id: string;
  label: string;
  shortLabel: string;
  vehicleOnly?: boolean;
}

const AVAILABLE_STAR_TIERS: StarTierOption[] = [
  { id: 'fresh', label: 'Fresh (Unassembled)', shortLabel: 'Fresh', vehicleOnly: true },
  { id: '0', label: '0★ (Standard / Base)', shortLabel: '0★' },
  { id: '1', label: '1★ (Tier 1)', shortLabel: '1★' },
  { id: '2', label: '2★ (Tier 2)', shortLabel: '2★' },
  { id: '3', label: '3★ (Tier 3)', shortLabel: '3★' },
  { id: '4', label: '4★ (Tier 4)', shortLabel: '4★', vehicleOnly: true },
  { id: '5', label: '5★ (Tier 5)', shortLabel: '5★', vehicleOnly: true }
];

function getRelativeTimeAgo(isoString?: string): string {
  if (!isoString) return 'Never';
  const time = new Date(isoString).getTime();
  if (isNaN(time)) return 'Unknown';
  const diff = Date.now() - time;
  if (diff < 0) return 'In future';
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export const AdminAutomationTools: React.FC = () => {
  const {
    items,
    auditLogs,
    batchAutomateItemDemands,
    resetSoldiersAndDronesToUniversal,
    isAdmin,
    activeStaff,
    resetAllGraphs,
    resetRecentlyUpdated,
    adjustItemRecentlyUpdated,
    batchAdjustRecentlyUpdated,
    resetItemGraph,
    autoSortTagsCategory
  } = useValueList();

  const [isSortingTags, setIsSortingTags] = useState(false);
  const [tagSortFeedback, setTagSortFeedback] = useState<string | null>(null);

  const handleAutoSortTags = async () => {
    setIsSortingTags(true);
    setTagSortFeedback(null);
    try {
      const res = await autoSortTagsCategory();
      setTagSortFeedback(res.message);
      if (res.count > 0) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    } catch (e: any) {
      setTagSortFeedback(`Failed: ${e.message || 'Error occurred'}`);
    } finally {
      setIsSortingTags(false);
    }
  };

  // Mode Selection
  const [automationMode, setAutomationMode] = useState<'demand' | 'scaler' | 'trend' | 'recent_and_graphs' | 'discord_webhooks'>('demand');

  // Discord Webhooks Mode State (Masked and Secret)
  const [suggestionWebhookInput, setSuggestionWebhookInput] = useState<string>('');
  const [changelogWebhookInput, setChangelogWebhookInput] = useState<string>('');
  const [showSuggestionWebhook, setShowSuggestionWebhook] = useState<boolean>(false);
  const [showChangelogWebhook, setShowChangelogWebhook] = useState<boolean>(false);
  const [isSavingWebhooks, setIsSavingWebhooks] = useState<boolean>(false);
  const [webhookSaveStatus, setWebhookSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Webhook configuration status from server (boolean flags only, never exposes actual URLs)
  const [webhookStatus, setWebhookStatus] = useState<{
    changelogConfigured: boolean;
    reportsConfigured: boolean;
  }>({ changelogConfigured: false, reportsConfigured: false });

  // Webhook test execution state
  const [isTestingWebhook, setIsTestingWebhook] = useState<'changelog' | 'suggestion' | null>(null);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; latencyMs?: number; message: string } | null>(null);

  // Fetch initial webhook status flags
  const refreshWebhookStatus = () => {
    fetch('/api/webhooks/status')
      .then(res => res.json())
      .then(data => {
        if (data?.webhooks) {
          setWebhookStatus({
            changelogConfigured: Boolean(data.webhooks.changelog?.configured),
            reportsConfigured: Boolean(data.webhooks.reports?.configured)
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshWebhookStatus();
  }, []);

  const handleSaveWebhooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionWebhookInput.trim() && !changelogWebhookInput.trim()) {
      setWebhookSaveStatus({
        success: false,
        message: 'Please enter at least one webhook URL to update.'
      });
      return;
    }

    setIsSavingWebhooks(true);
    setWebhookSaveStatus(null);
    try {
      const res = await fetch('/api/webhooks/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionsWebhookUrl: suggestionWebhookInput.trim() || undefined,
          changelogWebhookUrl: changelogWebhookInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Clear input values immediately to keep URLs masked and secret
        setSuggestionWebhookInput('');
        setChangelogWebhookInput('');
        setWebhookStatus({
          changelogConfigured: Boolean(data.changelogConfigured),
          reportsConfigured: Boolean(data.reportsConfigured)
        });
        setWebhookSaveStatus({
          success: true,
          message: 'Discord webhook URLs saved securely! All webhook endpoints are masked and protected.'
        });
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      } else {
        setWebhookSaveStatus({
          success: false,
          message: data.error || 'Failed to update Discord webhooks.'
        });
      }
    } catch (err: any) {
      setWebhookSaveStatus({
        success: false,
        message: err?.message || 'Network error saving webhooks.'
      });
    } finally {
      setIsSavingWebhooks(false);
    }
  };

  const handleTestWebhook = async (type: 'changelog' | 'suggestion') => {
    setIsTestingWebhook(type);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          tester: activeStaff?.username || 'Staff Administrator'
        })
      });
      const data = await res.json();
      setTestResult({
        type,
        success: Boolean(data.success),
        latencyMs: data.latencyMs,
        message: data.message || (data.success ? 'Webhook test delivered successfully!' : 'Webhook delivery failed.')
      });
    } catch (err: any) {
      setTestResult({
        type,
        success: false,
        message: err?.message || 'Network error while testing webhook connectivity.'
      });
    } finally {
      setIsTestingWebhook(null);
    }
  };

  // Graphs & Recently Updated Mode State
  const [ruSelectedItem, setRuSelectedItem] = useState<MilitaryItem | null>(null);
  const [ruSearchQuery, setRuSearchQuery] = useState<string>('');
  const [ruSelectedTimestamp, setRuSelectedTimestamp] = useState<string>(new Date().toISOString());
  const [ruCustomNote, setRuCustomNote] = useState<string>('');
  const [ruIsConfirmingGlobalGraphReset, setRuIsConfirmingGlobalGraphReset] = useState(false);
  const [ruIsConfirmingGlobalRuReset, setRuIsConfirmingGlobalRuReset] = useState(false);
  const [ruGlobalGraphNote, setRuGlobalGraphNote] = useState<string>('Periodic catalog valuation graph synchronization');
  const [ruBatchSelectedIds, setRuBatchSelectedIds] = useState<Set<string>>(new Set());
  const [ruBatchMode, setRuBatchMode] = useState<boolean>(false);
  const [ruBaselineDaysAgo, setRuBaselineDaysAgo] = useState<number>(30);
  const [ruSingleGraphResetDone, setRuSingleGraphResetDone] = useState<boolean>(false);
  const [ruIsSubmitting, setRuIsSubmitting] = useState<boolean>(false);

  // Step 1: Filters & Exclusions
  const [selectedRarities, setSelectedRarities] = useState<ItemRarity[]>(['Limited Edition']);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');
  const [excludeSoldiersAndDrones, setExcludeSoldiersAndDrones] = useState<boolean>(true);

  // Step 2: Star Levels (Default to 1-4 to match common use case)
  const [selectedStarTiers, setSelectedStarTiers] = useState<string[]>(['1', '2', '3', '4']);
  const [updateBaseDemand, setUpdateBaseDemand] = useState<boolean>(true);

  // Step 3: Target Demand & Trend Configuration
  const [targetDemand, setTargetDemand] = useState<number>(8);
  const [targetTrend, setTargetTrend] = useState<PriceTrend | 'keep'>('keep');
  const [customAuditReason, setCustomAuditReason] = useState<string>('');

  // Scaler Tool State
  const [valueAdjustmentPercent, setValueAdjustmentPercent] = useState<number>(0);

  // Tradeability Tool State
  const [targetTradeable, setTargetTradeable] = useState<boolean | 'keep'>('keep');

  // Step 4: Individual Selection / Exclusion State
  // We track excluded item IDs so default is ALL matched items are selected!
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(new Set());
  const [manuallyIncludedItemIds, setManuallyIncludedItemIds] = useState<Set<string>>(new Set());
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

  // UI States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPurgingOverrides, setIsPurgingOverrides] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<{
    success: boolean;
    count: number;
    message: string;
  } | null>(null);

  // Soldiers & Drones that currently have manual overrides
  const soldiersAndDronesWithOverrides = useMemo(() => {
    return items.filter(i => 
      isSoldierOrDroneCategory(i.category) && 
      (i.hasCustomMultiplierOverrides || (i.multiplierOverrides && Object.keys(i.multiplierOverrides).length > 0) || i.hasCustomStarOverrides || i.starOverrides || (i.starTierOverrides && Object.keys(i.starTierOverrides).length > 0))
    );
  }, [items]);

  // Top recently updated items sorted descending - only show items with genuine recent updates
  const topRecentlyUpdatedItems = useMemo(() => {
    const recentItemIds = new Set<string>();
    auditLogs.forEach(l => {
      if ((l.action === 'PRICE_UPDATE' || l.action === 'REPORT_ACCEPTED') && l.itemId) {
        recentItemIds.add(l.itemId);
      }
    });

    const itemsWithUpdates = items.filter(i => {
      if (recentItemIds.has(i.id)) return true;
      if (hasItemPriceChanges(i)) return true;
      return false;
    });

    return itemsWithUpdates.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }, [items, auditLogs]);

  // Filtered items for Recently Updated manual selector
  const filteredRuItems = useMemo(() => {
    if (!ruSearchQuery.trim()) return items;
    const query = ruSearchQuery.toLowerCase().trim();
    return items.filter(i => 
      i.name.toLowerCase().includes(query) || 
      (i.acronym && i.acronym.toLowerCase().includes(query)) ||
      i.category.toLowerCase().includes(query) ||
      i.rarity.toLowerCase().includes(query)
    );
  }, [items, ruSearchQuery]);

  // Calculate items that match current filters (Rarity + Category)
  const matchedItems = useMemo(() => {
    return items.filter(item => {
      // Rarity match
      if (selectedRarities.length > 0 && !selectedRarities.includes(item.rarity)) {
        return false;
      }
      // Category match
      if (selectedCategory !== 'All') {
        const itemCat = item.category === 'Sea' ? 'Naval' : item.category;
        if (itemCat !== selectedCategory) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedRarities, selectedCategory]);

  // Dynamic Rarity count reflecting the currently selected category & exclusion
  const getRarityCount = (rarity: ItemRarity) => {
    return items.filter(i => {
      if (selectedCategory !== 'All') {
        const itemCat = i.category === 'Sea' ? 'Naval' : i.category;
        if (itemCat !== selectedCategory) return false;
      } else if (excludeSoldiersAndDrones && isSoldierOrDroneCategory(i.category)) {
        return false;
      }
      return i.rarity === rarity;
    }).length;
  };

  // Dynamic Category count reflecting currently selected rarities
  const getCategoryCount = (cat: ItemCategory | 'All') => {
    return items.filter(i => {
      const itemCat = i.category === 'Sea' ? 'Naval' : i.category;
      if (cat !== 'All' && itemCat !== cat) return false;
      if (selectedRarities.length > 0 && !selectedRarities.includes(i.rarity)) return false;
      return true;
    }).length;
  };

  // Statistics for Soldiers & Drones within matched items
  const matchedSoldiersCount = useMemo(() => {
    return matchedItems.filter(i => i.category === 'Soldier').length;
  }, [matchedItems]);

  const matchedDronesCount = useMemo(() => {
    return matchedItems.filter(i => i.category === 'Drone').length;
  }, [matchedItems]);

  const matchedSoldiersAndDronesTotal = matchedSoldiersCount + matchedDronesCount;

  // Determine if a specific item is excluded
  const isItemExcluded = (item: MilitaryItem): boolean => {
    // If explicitly included by the administrator, allow it
    if (manuallyIncludedItemIds.has(item.id)) return false;
    // If explicitly deselected by the administrator, exclude it
    if (excludedItemIds.has(item.id)) return true;
    // If Soldier & Drone exclusion is active, auto-exclude them (unless category is specifically Soldier or Drone)
    if (excludeSoldiersAndDrones && selectedCategory === 'All' && isSoldierOrDroneCategory(item.category)) {
      return true;
    }
    return false;
  };

  // Selected items (matched items that are NOT excluded)
  const selectedItems = useMemo(() => {
    return matchedItems.filter(item => !isItemExcluded(item));
  }, [matchedItems, excludedItemIds, manuallyIncludedItemIds, excludeSoldiersAndDrones, selectedCategory]);

  // Excluded items list for clear visibility
  const excludedItems = useMemo(() => {
    return matchedItems.filter(item => isItemExcluded(item));
  }, [matchedItems, excludedItemIds, manuallyIncludedItemIds, excludeSoldiersAndDrones, selectedCategory]);

  // Count of specifically protected Soldiers & Drones currently excluded
  const excludedSoldiersAndDronesCount = useMemo(() => {
    return excludedItems.filter(i => isSoldierOrDroneCategory(i.category)).length;
  }, [excludedItems]);

  // Filtered view of matched items based on internal search query
  const displayItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return matchedItems;
    const query = itemSearchQuery.toLowerCase().trim();
    return matchedItems.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const acronymMatch = item.acronym ? item.acronym.toLowerCase().includes(query) : false;
      const categoryMatch = item.category.toLowerCase().includes(query);
      return nameMatch || acronymMatch || categoryMatch;
    });
  }, [matchedItems, itemSearchQuery]);

  // Handle Category Selection
  const handleSelectCategory = (cat: ItemCategory | 'All') => {
    setSelectedCategory(cat);
    setExcludedItemIds(new Set());
    setManuallyIncludedItemIds(new Set());
    // If admin specifically selects Soldier or Drone category, turn off exclusion so units are visible & editable
    if (cat === 'Soldier' || cat === 'Drone') {
      setExcludeSoldiersAndDrones(false);
    }
  };

  // Handle Rarity Toggle
  const toggleRarity = (rarity: ItemRarity) => {
    setSelectedRarities(prev => {
      if (prev.includes(rarity)) {
        return prev.filter(r => r !== rarity);
      } else {
        return [...prev, rarity];
      }
    });
    // Reset exclusions when primary filter changes
    setExcludedItemIds(new Set());
    setManuallyIncludedItemIds(new Set());
  };

  // Quick Rarity Presets
  const setRarityPreset = (type: 'LE_ONLY' | 'EXOTIC_ONLY' | 'HIGH_TIER' | 'ALL' | 'CLEAR') => {
    setExcludedItemIds(new Set());
    setManuallyIncludedItemIds(new Set());
    switch (type) {
      case 'LE_ONLY':
        setSelectedRarities(['Limited Edition']);
        break;
      case 'EXOTIC_ONLY':
        setSelectedRarities(['Exotic']);
        break;
      case 'HIGH_TIER':
        setSelectedRarities(['Limited Edition', 'Exotic']);
        break;
      case 'ALL':
        setSelectedRarities([...ALL_RARITIES]);
        break;
      case 'CLEAR':
        setSelectedRarities([]);
        break;
    }
  };

  // Handle Star Tier Toggle
  const toggleStarTier = (tierId: string) => {
    setSelectedStarTiers(prev => {
      if (prev.includes(tierId)) {
        return prev.filter(t => t !== tierId);
      } else {
        return [...prev, tierId];
      }
    });
  };

  // Quick Star Tier Presets
  const setStarTierPreset = (preset: '1_TO_4' | '1_TO_5' | '1_TO_3' | 'BASE_ONLY' | 'ALL' | 'CLEAR') => {
    switch (preset) {
      case '1_TO_4':
        setSelectedStarTiers(['1', '2', '3', '4']);
        break;
      case '1_TO_5':
        setSelectedStarTiers(['1', '2', '3', '4', '5']);
        break;
      case '1_TO_3':
        setSelectedStarTiers(['1', '2', '3']);
        break;
      case 'BASE_ONLY':
        setSelectedStarTiers(['0']);
        break;
      case 'ALL':
        setSelectedStarTiers(['fresh', '0', '1', '2', '3', '4', '5']);
        break;
      case 'CLEAR':
        setSelectedStarTiers([]);
        break;
    }
  };

  // Item Selection / Deselection Controls
  const toggleItemSelection = (itemId: string) => {
    const item = matchedItems.find(i => i.id === itemId);
    if (!item) return;

    const currentlyExcluded = isItemExcluded(item);
    if (currentlyExcluded) {
      // User wants to INCLUDE this item
      setExcludedItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setManuallyIncludedItemIds(prev => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
    } else {
      // User wants to EXCLUDE this item
      setManuallyIncludedItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setExcludedItemIds(prev => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
    }
  };

  const handleSelectAllMatched = () => {
    setExcludedItemIds(new Set());
    setManuallyIncludedItemIds(new Set(matchedItems.map(i => i.id)));
  };

  const handleDeselectAllMatched = () => {
    setManuallyIncludedItemIds(new Set());
    const allIds = new Set(matchedItems.map(i => i.id));
    setExcludedItemIds(allIds);
  };

  const handleInvertSelection = () => {
    matchedItems.forEach(item => {
      toggleItemSelection(item.id);
    });
  };

  // Dedicated Actions for Soldiers & Drones Exclusion
  const handleExcludeAllSoldiersAndDrones = () => {
    setExcludeSoldiersAndDrones(true);
    setManuallyIncludedItemIds(prev => {
      const next = new Set(prev);
      matchedItems.forEach(i => {
        if (isSoldierOrDroneCategory(i.category)) {
          next.delete(i.id);
        }
      });
      return next;
    });
  };

  const handleIncludeAllSoldiersAndDrones = () => {
    setExcludeSoldiersAndDrones(false);
    setExcludedItemIds(prev => {
      const next = new Set(prev);
      matchedItems.forEach(i => {
        if (isSoldierOrDroneCategory(i.category)) {
          next.delete(i.id);
        }
      });
      return next;
    });
    setManuallyIncludedItemIds(prev => {
      const next = new Set(prev);
      matchedItems.forEach(i => {
        if (isSoldierOrDroneCategory(i.category)) {
          next.add(i.id);
        }
      });
      return next;
    });
  };

  const includeExcludedItem = (itemId: string) => {
    const item = matchedItems.find(i => i.id === itemId);
    if (!item) return;
    setExcludedItemIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    setManuallyIncludedItemIds(prev => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  };

  // Execute Automation
  const handleExecuteAutomation = async () => {
    if (selectedItems.length === 0) return;
    if (selectedStarTiers.length === 0 && !updateBaseDemand) return;

    setIsExecuting(true);
    setLastExecutionResult(null);

    try {
      const targetIds = selectedItems.map(i => i.id);
      const starTierText = selectedStarTiers.map(t => t === 'fresh' ? 'Fresh' : `${t}★`).join(', ');
      const raritiesText = selectedRarities.join(', ');
      const soldierDroneNote = excludedSoldiersAndDronesCount > 0 
        ? ` (${excludedSoldiersAndDronesCount} Soldiers/Drones excluded)`
        : '';

      const defaultReason = customAuditReason.trim() || 
        `Automated bulk demand update: Set to ${targetDemand}/10 on star level(s) [${starTierText}] for ${selectedItems.length} items (${raritiesText})${soldierDroneNote}`;

      const result = await batchAutomateItemDemands({
        itemIds: targetIds,
        starTiers: selectedStarTiers,
        newDemand: targetDemand,
        updateBaseDemand: updateBaseDemand,
        excludeSoldiersAndDrones: excludeSoldiersAndDrones,
        newTrend: targetTrend === 'keep' ? undefined : targetTrend,
        valueAdjustmentPercent: automationMode === 'scaler' && valueAdjustmentPercent !== 0 ? valueAdjustmentPercent : undefined,
        newTradeable: automationMode === 'trend' && targetTradeable !== 'keep' ? targetTradeable : undefined,
        auditReason: defaultReason
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b']
        });
      } catch (e) {
        // Confetti optional
      }

      setLastExecutionResult({
        success: true,
        count: result.updatedCount,
        message: `Successfully updated demand to ${targetDemand}/10 across ${result.updatedCount} items on star tiers [${starTierText}]!`
      });

      setIsConfirmModalOpen(false);
    } catch (err: any) {
      console.error('Automation execution failed:', err);
      setLastExecutionResult({
        success: false,
        count: 0,
        message: `Failed to execute automation: ${err?.message || 'Unknown error'}`
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApplySingleRu = () => {
    if (!ruSelectedItem) return;
    setRuIsSubmitting(true);
    try {
      const res = adjustItemRecentlyUpdated(ruSelectedItem.id, ruSelectedTimestamp, ruCustomNote.trim() || undefined);
      if (res.success) {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
        setLastExecutionResult({
          success: true,
          count: 1,
          message: `Successfully adjusted timestamp for "${ruSelectedItem.name}" to ${new Date(ruSelectedTimestamp).toLocaleString()}`
        });
        // Update the local selected item reference
        const updatedTarget = items.find(i => i.id === ruSelectedItem.id);
        if (updatedTarget) setRuSelectedItem(updatedTarget);
      } else {
        setLastExecutionResult({
          success: false,
          count: 0,
          message: res.message
        });
      }
    } finally {
      setRuIsSubmitting(false);
    }
  };

  const handleApplyBatchRu = async () => {
    if (ruBatchSelectedIds.size === 0) return;
    setRuIsSubmitting(true);
    try {
      const res = await batchAdjustRecentlyUpdated(Array.from(ruBatchSelectedIds), ruSelectedTimestamp, ruCustomNote.trim() || undefined);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setLastExecutionResult({
        success: true,
        count: res.count,
        message: `Successfully adjusted Recently Updated timestamp for ${res.count} items.`
      });
      setRuBatchSelectedIds(new Set());
    } catch (err: any) {
      setLastExecutionResult({
        success: false,
        count: 0,
        message: err.message || 'Batch update failed'
      });
    } finally {
      setRuIsSubmitting(false);
    }
  };

  const handleExecuteGlobalGraphReset = async () => {
    setRuIsSubmitting(true);
    try {
      const res = await resetAllGraphs(ruGlobalGraphNote.trim() || undefined);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      setLastExecutionResult({
        success: true,
        count: res.count,
        message: `Successfully reset valuation graphs for all ${res.count} catalog items. Points are now recorded only on changes without daily filler points.`
      });
      setRuIsConfirmingGlobalGraphReset(false);
    } catch (err: any) {
      setLastExecutionResult({
        success: false,
        count: 0,
        message: err.message || 'Global graph reset failed'
      });
    } finally {
      setRuIsSubmitting(false);
    }
  };

  const handleExecuteGlobalRuReset = async () => {
    setRuIsSubmitting(true);
    try {
      const baselineDate = new Date(Date.now() - ruBaselineDaysAgo * 24 * 60 * 60 * 1000).toISOString();
      const res = await resetRecentlyUpdated(baselineDate);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setLastExecutionResult({
        success: true,
        count: res.count,
        message: `Successfully reset Recently Updated timestamps for all ${res.count} items back to baseline (${ruBaselineDaysAgo} days ago).`
      });
      setRuIsConfirmingGlobalRuReset(false);
    } catch (err: any) {
      setLastExecutionResult({
        success: false,
        count: 0,
        message: err.message || 'Global Recently Updated reset failed'
      });
    } finally {
      setRuIsSubmitting(false);
    }
  };

  const handleResetSingleGraph = (item: MilitaryItem) => {
    resetItemGraph(item.id);
    setRuSingleGraphResetDone(true);
    setTimeout(() => setRuSingleGraphResetDone(false), 3000);
    setLastExecutionResult({
      success: true,
      count: 1,
      message: `Valuation graph for "${item.name}" has been reset to a clean 30-day history with 0 duplicate days.`
    });
  };

  if (!isAdmin) {
    return (
      <div id="admin-automation-denied" className="p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-950 dark:text-white uppercase">
          Admin Access Required
        </h4>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Automation Tools are restricted to administrators. Please authenticate with an Administrator profile to use bulk operations.
        </p>
      </div>
    );
  }

  const demandDesc = getDemandDescription(targetDemand);

  return (
    <div id="admin-automation-suite" className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-neutral-900 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="font-['Chakra_Petch'] text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                Admin Automation Tools
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                Admin Suite
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Batch-automate demand ratings, star tier overrides, and catalog parameters across filtered rarities and star levels with granular inclusion and deselection.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 shrink-0">
            <button
              id="auto-mode-demand"
              type="button"
              onClick={() => setAutomationMode('demand')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                automationMode === 'demand'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Demand & Stars</span>
            </button>
            <button
              id="auto-mode-scaler"
              type="button"
              onClick={() => setAutomationMode('scaler')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                automationMode === 'scaler'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Value Scaler</span>
            </button>
            <button
              id="auto-mode-trend"
              type="button"
              onClick={() => setAutomationMode('trend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                automationMode === 'trend'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trend & Trade</span>
            </button>
            <button
              id="auto-mode-recent-graphs"
              type="button"
              onClick={() => setAutomationMode('recent_and_graphs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                automationMode === 'recent_and_graphs'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Graphs & Recently Updated</span>
            </button>
            <button
              id="auto-mode-discord-webhooks"
              type="button"
              onClick={() => setAutomationMode('discord_webhooks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                automationMode === 'discord_webhooks'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Discord Webhooks</span>
            </button>
          </div>
        </div>
      </div>

      {/* Execution Feedback Notification */}
      {lastExecutionResult && (
        <div
          id="automation-feedback-alert"
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm animate-fade-in ${
            lastExecutionResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {lastExecutionResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <span className="font-bold">
                {lastExecutionResult.success ? 'Automation Executed Successfully' : 'Execution Error'}
              </span>
              <p className="text-xs opacity-90">{lastExecutionResult.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastExecutionResult(null)}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Configuration Grid & Views */}
      {automationMode === 'discord_webhooks' ? (
        <div id="discord-webhooks-hub" className="space-y-6 animate-fade-in">
          {/* Top Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="font-['Chakra_Petch'] font-bold text-base uppercase tracking-wider text-neutral-900 dark:text-white">
                  Discord Webhooks & Public Feeds
                </h3>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl">
                Configure real-time Discord webhook feeds for community value suggestions and public catalog changelogs. Webhook URLs are kept completely secret and never revealed in client views once submitted.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-700 text-orange-600 dark:text-orange-400 shadow-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Masked & Secret Storage</span>
              </span>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Suggestions Webhook Status */}
            <div className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                    💡
                  </div>
                  <div>
                    <h4 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                      Community Suggestions Feed
                    </h4>
                    <span className="text-[11px] text-neutral-500">
                      Dispatches current ➔ suggested values & star tiers
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                  webhookStatus.reportsConfigured
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                }`}>
                  {webhookStatus.reportsConfigured ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Active / Configured
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-neutral-400" />
                      Not Configured
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Whenever community members submit price corrections or star tier adjustments with market proof, formatted embeds with comparison values are pushed to this channel.
              </p>
              <div className="pt-1 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80">
                <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Public-Only Embed Fields
                </span>
                <button
                  type="button"
                  disabled={isTestingWebhook !== null}
                  onClick={() => handleTestWebhook('suggestion')}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{isTestingWebhook === 'suggestion' ? 'Testing...' : 'Test Suggestions Webhook'}</span>
                </button>
              </div>
            </div>

            {/* Changelog Webhook Status */}
            <div className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    📢
                  </div>
                  <div>
                    <h4 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                      Public Changelog Feed
                    </h4>
                    <span className="text-[11px] text-neutral-500">
                      Dispatches only modified fields (e.g. Demand 5 ➔ 7)
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                  webhookStatus.changelogConfigured
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                }`}>
                  {webhookStatus.changelogConfigured ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Active / Configured
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-neutral-400" />
                      Not Configured
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Whenever staff modifies item values, demand ratings, or catalog properties, a diff embed displaying specifically what changed is pushed to your Discord changelog channel.
              </p>
              <div className="pt-1 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80">
                <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Public-Only Diff Logs
                </span>
                <button
                  type="button"
                  disabled={isTestingWebhook !== null}
                  onClick={() => handleTestWebhook('changelog')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{isTestingWebhook === 'changelog' ? 'Testing...' : 'Test Changelog Webhook'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Feedback Banner */}
          {testResult && (
            <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200' 
                : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200'
            }`}>
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h5 className="font-['Chakra_Petch'] font-bold text-sm uppercase tracking-wider">
                    {testResult.type === 'changelog' ? 'Changelog Webhook Test' : 'Suggestions Webhook Test'}: {testResult.success ? 'Delivered' : 'Delivery Failed'}
                  </h5>
                  <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                  {testResult.latencyMs !== undefined && testResult.latencyMs > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/10 dark:bg-white/10">
                      Roundtrip Latency: {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleSaveWebhooks} className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-orange-500" />
                <h4 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                  Update Discord Webhook Endpoints
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Enter Discord channel webhook links below. For maximum security, URLs are masked upon input and erased from display immediately after saving.
              </p>
            </div>

            {webhookSaveStatus && (
              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                webhookSaveStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}>
                <span>{webhookSaveStatus.message}</span>
                <button
                  type="button"
                  onClick={() => setWebhookSaveStatus(null)}
                  className="font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Suggestion Webhook Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  1. Suggestions Webhook Link
                </label>
                <div className="relative">
                  <input
                    type={showSuggestionWebhook ? 'text' : 'password'}
                    placeholder="https://discord.com/api/webhooks/..."
                    value={suggestionWebhookInput}
                    onChange={(e) => setSuggestionWebhookInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 font-mono focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSuggestionWebhook(!showSuggestionWebhook)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1"
                    title={showSuggestionWebhook ? 'Hide URL' : 'Show URL'}
                  >
                    {showSuggestionWebhook ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Receives community item valuations & star tier price suggestions.
                </span>
              </div>

              {/* Changelog Webhook Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  2. Public Changelog Webhook Link
                </label>
                <div className="relative">
                  <input
                    type={showChangelogWebhook ? 'text' : 'password'}
                    placeholder="https://discord.com/api/webhooks/..."
                    value={changelogWebhookInput}
                    onChange={(e) => setChangelogWebhookInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangelogWebhook(!showChangelogWebhook)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1"
                    title={showChangelogWebhook ? 'Hide URL' : 'Show URL'}
                  >
                    {showChangelogWebhook ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Receives public diffs of modified values, demand shifts, and catalog edits.
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>Zero Exposure Protocol: Secrets are encrypted and cleared from browser state.</span>
              </div>
              <button
                type="submit"
                disabled={isSavingWebhooks || (!suggestionWebhookInput.trim() && !changelogWebhookInput.trim())}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingWebhooks ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Securely...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Discord Webhooks</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : automationMode !== 'recent_and_graphs' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Filter & Targeting Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Select Rarity & Category */}
          <div className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-['Chakra_Petch'] font-black text-xs flex items-center justify-center border border-emerald-500/20">
                  1
                </span>
                <h3 className="font-['Chakra_Petch'] font-bold text-sm uppercase tracking-wide text-neutral-900 dark:text-white">
                  Target Rarities & Category
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRarityPreset('LE_ONLY')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                >
                  LE Only
                </button>
                <button
                  type="button"
                  onClick={() => setRarityPreset('HIGH_TIER')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  LE + Exotic
                </button>
                <button
                  type="button"
                  onClick={() => setRarityPreset('ALL')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setRarityPreset('CLEAR')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Rarity Multi-Select Chips */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Select Rarity:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_RARITIES.map(rarity => {
                  const isSelected = selectedRarities.includes(rarity);
                  const config = getRarityConfig(rarity);
                  const count = getRarityCount(rarity);

                  return (
                    <button
                      key={rarity}
                      id={`rarity-chip-${rarity.toLowerCase().replace(/\s+/g, '-')}`}
                      type="button"
                      onClick={() => toggleRarity(rarity)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                        isSelected
                          ? `${config.bg} ${config.text} ${config.border} shadow-xs font-bold ring-2 ring-emerald-500/20`
                          : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-current' : 'bg-neutral-400'}`} />
                        <span className="truncate">{rarity}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                        isSelected
                          ? 'bg-black/15 dark:bg-white/20 text-current shadow-2xs'
                          : 'bg-neutral-200/70 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300'
                      }`}>
                        {count.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Filter Category:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map(cat => {
                  const isSelected = selectedCategory === cat;
                  const catCount = getCategoryCount(cat);

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center ${
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                        isSelected
                          ? 'bg-white/25 text-white shadow-2xs'
                          : 'bg-neutral-200/70 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300'
                      }`}>
                        {catCount.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unit Type Exclusion Toggle: Soldiers & Drones */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div 
                id="exclude-soldiers-drones-container"
                className={`p-3.5 rounded-xl border transition-all ${
                  excludeSoldiersAndDrones && selectedCategory === 'All'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      id="exclude-soldiers-drones-checkbox"
                      type="checkbox"
                      checked={excludeSoldiersAndDrones && selectedCategory === 'All'}
                      disabled={selectedCategory === 'Soldier' || selectedCategory === 'Drone'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleExcludeAllSoldiersAndDrones();
                        } else {
                          handleIncludeAllSoldiersAndDrones();
                        }
                      }}
                      className="mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <ShieldOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Exclude Soldiers & Drones
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          excludeSoldiersAndDrones && selectedCategory === 'All'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          {excludeSoldiersAndDrones && selectedCategory === 'All' ? 'Protected (Excluded)' : 'Included'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Prevents infantry soldiers and drones (max 3★) from being altered. Vehicles and other catalog units will be updated.
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400">
                      {matchedSoldiersAndDronesTotal.toLocaleString()} matched ({matchedSoldiersCount.toLocaleString()} soldiers, {matchedDronesCount.toLocaleString()} drones)
                    </span>
                    {soldiersAndDronesWithOverrides.length > 0 && (
                      <button
                        type="button"
                        disabled={isPurgingOverrides}
                        onClick={async () => {
                          setIsPurgingOverrides(true);
                          try {
                            const res = await resetSoldiersAndDronesToUniversal();
                            setLastExecutionResult({
                              success: true,
                              count: res.updatedCount,
                              message: `Successfully cleared manual overrides on ${res.updatedCount} soldiers/drones and reverted them to universal multipliers (1x, 5x, 20x, 50x).`
                            });
                          } catch (err) {
                            console.error('Failed to purge soldier/drone overrides:', err);
                          } finally {
                            setIsPurgingOverrides(false);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                        title="Clear manual overrides on all soldiers and drones to use universal multipliers (1x, 5x, 20x, 50x)"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isPurgingOverrides ? 'animate-spin' : ''}`} />
                        <span>Purge {soldiersAndDronesWithOverrides.length} Soldier/Drone Overrides</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Select Star Level(s) */}
          <div className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-['Chakra_Petch'] font-black text-xs flex items-center justify-center border border-emerald-500/20">
                  2
                </span>
                <h3 className="font-['Chakra_Petch'] font-bold text-sm uppercase tracking-wide text-neutral-900 dark:text-white">
                  Target Star Levels
                </h3>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  id="star-preset-1-4"
                  type="button"
                  onClick={() => setStarTierPreset('1_TO_4')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                  title="Select Star levels 1 to 4"
                >
                  Stars 1-4
                </button>
                <button
                  type="button"
                  onClick={() => setStarTierPreset('1_TO_5')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  Stars 1-5
                </button>
                <button
                  type="button"
                  onClick={() => setStarTierPreset('1_TO_3')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  Stars 1-3
                </button>
                <button
                  type="button"
                  onClick={() => setStarTierPreset('ALL')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  All Stars
                </button>
                <button
                  type="button"
                  onClick={() => setStarTierPreset('CLEAR')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Star Tiers Multi-select Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AVAILABLE_STAR_TIERS.map(tier => {
                const isSelected = selectedStarTiers.includes(tier.id);

                return (
                  <button
                    key={tier.id}
                    id={`star-tier-btn-${tier.id}`}
                    type="button"
                    onClick={() => toggleStarTier(tier.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-['Chakra_Petch'] font-black text-sm text-neutral-900 dark:text-white flex items-center gap-1">
                        <Star className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-500 fill-amber-500' : 'text-neutral-400'}`} />
                        {tier.shortLabel}
                      </span>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1 truncate">
                      {tier.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Base Item Demand Checkbox */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  id="update-base-demand-checkbox"
                  type="checkbox"
                  checked={updateBaseDemand}
                  onChange={(e) => setUpdateBaseDemand(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Also update Base Item Demand (Catalog 0★ Standard)
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    When enabled, updates both the item's standard base catalog demand and the selected star tier overrides.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Demand & Execution Parameters (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* STEP 3: Demand Value Selector */}
          <div className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-['Chakra_Petch'] font-black text-xs flex items-center justify-center border border-emerald-500/20">
                3
              </span>
              <h3 className="font-['Chakra_Petch'] font-bold text-sm uppercase tracking-wide text-neutral-900 dark:text-white">
                New Target Demand & Parameters
              </h3>
            </div>

            {/* Target Demand Display */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500">
                  Target Demand Rating:
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${demandDesc.badgeBg} ${demandDesc.color}`}>
                  {demandDesc.scoreLabel}
                </span>
              </div>

              {/* Slider */}
              <input
                id="target-demand-slider"
                type="range"
                min="1"
                max="10"
                step="1"
                value={targetDemand}
                onChange={(e) => setTargetDemand(parseInt(e.target.value))}
                className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />

              {/* Number Buttons 1 to 10 */}
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <button
                    key={num}
                    id={`demand-btn-${num}`}
                    type="button"
                    onClick={() => setTargetDemand(num)}
                    className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      targetDemand === num
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Trend Setting (Optional) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Price Trend Setting:
              </label>
              <select
                id="target-trend-select"
                value={targetTrend}
                onChange={(e) => setTargetTrend(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121624] border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="keep">Keep Existing Item Trends (No Trend Change)</option>
                <option value="Rising">Rising ↗</option>
                <option value="Stable">Stable ➔</option>
                <option value="Dropping">Dropping ↘</option>
                <option value="Glazed">Glazed / Hyped</option>
                <option value="Unstable">Unstable</option>
              </select>
            </div>

            {/* Value Scaler Tool (If mode === scaler) */}
            {automationMode === 'scaler' && (
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-300/60 dark:border-purple-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                    Value Percentage Adjustment:
                  </span>
                  <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400">
                    {valueAdjustmentPercent > 0 ? `+${valueAdjustmentPercent}%` : `${valueAdjustmentPercent}%`}
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[-15, -10, -5, 0, 5, 10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setValueAdjustmentPercent(pct)}
                      className={`px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                        valueAdjustmentPercent === pct
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Audit Reason */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Audit Log Reason (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g., Post-patch market balance for LE star tiers"
                value={customAuditReason}
                onChange={(e) => setCustomAuditReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121624] border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Summary & Execution Card */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-950 dark:text-emerald-200">
                  Ready to Update:
                </span>
                <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {selectedItems.length} items
                </span>
              </div>

              {excludeSoldiersAndDrones && selectedCategory === 'All' && (
                <div className="flex items-center justify-between text-[11px] pt-0.5 text-emerald-800 dark:text-emerald-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Soldiers & Drones:
                  </span>
                  <span className="font-bold">
                    Excluded ({excludedSoldiersAndDronesCount} units protected)
                  </span>
                </div>
              )}

              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Will apply demand <span className="font-bold text-emerald-600 dark:text-emerald-400">{targetDemand}/10</span> to star tiers{' '}
                <span className="font-semibold">{selectedStarTiers.map(t => t === 'fresh' ? 'Fresh' : `${t}★`).join(', ') || 'None'}</span>
                {excludedItems.length > 0 && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400 font-semibold">
                    (Excluding {excludedItems.length} item{excludedItems.length > 1 ? 's' : ''}: {excludedItems.map(i => i.name).slice(0, 3).join(', ')}{excludedItems.length > 3 ? '...' : ''})
                  </span>
                )}
              </p>

              <button
                id="execute-automation-btn"
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={selectedItems.length === 0 || (selectedStarTiers.length === 0 && !updateBaseDemand) || isExecuting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Execute Automation ({selectedItems.length} Items)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 4: Matched Items Review & Granular Deselection */}
      <div className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-['Chakra_Petch'] font-black text-xs flex items-center justify-center border border-emerald-500/20">
              4
            </span>
            <div className="space-y-0.5">
              <h3 className="font-['Chakra_Petch'] font-bold text-sm uppercase tracking-wide text-neutral-900 dark:text-white">
                Review Matched Units ({matchedItems.length})
              </h3>
              <p className="text-[11px] text-neutral-500">
                {selectedItems.length} selected for update • {excludedItems.length} excluded/deselected
                {excludedSoldiersAndDronesCount > 0 && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    ({excludedSoldiersAndDronesCount} soldiers/drones protected)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Granular Selection Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              id="select-all-matched-btn"
              type="button"
              onClick={handleSelectAllMatched}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Select All</span>
            </button>

            <button
              id="deselect-all-matched-btn"
              type="button"
              onClick={handleDeselectAllMatched}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Deselect all matched items"
            >
              <Square className="w-3.5 h-3.5 text-neutral-400" />
              <span>Deselect All</span>
            </button>

            <button
              id="invert-selection-btn"
              type="button"
              onClick={handleInvertSelection}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>Invert</span>
            </button>

            {/* Quick Soldier/Drone Exclusion Buttons */}
            {matchedSoldiersAndDronesTotal > 0 && selectedCategory === 'All' && (
              <button
                id="toggle-soldier-drone-exclusion-btn"
                type="button"
                onClick={() => {
                  if (excludeSoldiersAndDrones) {
                    handleIncludeAllSoldiersAndDrones();
                  } else {
                    handleExcludeAllSoldiersAndDrones();
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                  excludeSoldiersAndDrones
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
                title={excludeSoldiersAndDrones ? 'Click to include soldiers & drones' : 'Click to exclude soldiers & drones'}
              >
                <ShieldOff className={`w-3.5 h-3.5 ${excludeSoldiersAndDrones ? 'text-emerald-500' : 'text-neutral-400'}`} />
                <span>{excludeSoldiersAndDrones ? 'Soldiers/Drones Excluded' : 'Exclude Soldiers/Drones'}</span>
              </button>
            )}

            {/* Quick Auto-Sort Tags Button */}
            <button
              id="auto-sort-tags-btn"
              type="button"
              disabled={isSortingTags}
              onClick={handleAutoSortTags}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-300 hover:bg-pink-500/20 disabled:opacity-50"
              title="Automatically scan and categorize all taglines, taunts, emblems, banners, and non-weapon/armor items into the Tags category"
            >
              <Tag className="w-3.5 h-3.5 text-pink-500" />
              <span>{isSortingTags ? 'Sorting Tags...' : 'Auto-Sort Tags'}</span>
            </button>
          </div>
        </div>

        {tagSortFeedback && (
          <div className="px-3 py-2 rounded-xl bg-pink-500/10 border border-pink-500/30 text-xs font-medium text-pink-700 dark:text-pink-300 flex items-center justify-between">
            <span>{tagSortFeedback}</span>
            <button type="button" onClick={() => setTagSortFeedback(null)} className="text-pink-500 hover:text-pink-700 ml-2 font-bold cursor-pointer">✕</button>
          </div>
        )}

        {/* Quick Filter Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="automation-item-search"
            type="text"
            placeholder="Search matched items by name or acronym (e.g. Bismarck)..."
            value={itemSearchQuery}
            onChange={(e) => setItemSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:border-emerald-500 focus:outline-none"
          />
          {itemSearchQuery && (
            <button
              type="button"
              onClick={() => setItemSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Excluded Items Strip (if any items are deselected) */}
        {excludedItems.length > 0 && (
          <div id="excluded-items-strip" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Excluded Items ({excludedItems.length}) - These will NOT be modified:
              </span>
              <div className="flex items-center gap-2">
                {excludedSoldiersAndDronesCount > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldOff className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {excludedSoldiersAndDronesCount} Soldiers/Drones protected
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSelectAllMatched}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                >
                  Clear all exclusions
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {excludedItems.map(item => {
                const isSoldierDrone = isSoldierOrDroneCategory(item.category);
                return (
                  <button
                    key={item.id}
                    id={`include-item-pill-${item.id}`}
                    type="button"
                    onClick={() => includeExcludedItem(item.id)}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSoldierDrone
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-900 dark:text-amber-200'
                    }`}
                    title="Click to re-include this item in the automation"
                  >
                    <span>{item.name}</span>
                    {isSoldierDrone && (
                      <span className="text-[9px] uppercase font-bold opacity-75">({item.category})</span>
                    )}
                    <X className="w-3 h-3 opacity-70" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Items Grid */}
        <div className="max-h-96 overflow-y-auto pr-1 space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {displayItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No items match the current filters or search query.
            </div>
          ) : (
            displayItems.map(item => {
              const isSelected = !isItemExcluded(item);
              const rarityConfig = getRarityConfig(item.rarity);
              const isSoldierDrone = isSoldierOrDroneCategory(item.category);

              return (
                <div
                  key={item.id}
                  id={`item-row-${item.id}`}
                  className={`pt-2.5 pb-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-neutral-50/50 dark:bg-neutral-800/20 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40'
                      : isSoldierDrone && excludeSoldiersAndDrones
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/15 border border-emerald-500/20 opacity-80 hover:opacity-100'
                        : 'bg-red-500/5 dark:bg-red-950/10 border border-red-500/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Left: Checkbox & Item Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleItemSelection(item.id)}
                      className="shrink-0 p-1 text-neutral-400 hover:text-emerald-500 cursor-pointer"
                      title={isSelected ? 'Deselect item' : 'Select item'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>

                    <img
                      src={getSafeImageUrl(item.thumbnail)}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-['Chakra_Petch'] font-bold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        {item.acronym && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            ({item.acronym})
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${rarityConfig.badgeBg} ${rarityConfig.text}`}>
                          {item.rarity}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {item.category}
                        </span>
                        {isSoldierDrone && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700">
                            Max 3★
                          </span>
                        )}
                        {!isSelected && isSoldierDrone && excludeSoldiersAndDrones && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <ShieldOff className="w-2.5 h-2.5" />
                            Protected
                          </span>
                        )}
                      </div>

                      {/* Current Demand Snapshot */}
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5 flex-wrap">
                        <span>Base Demand: <strong className="text-neutral-700 dark:text-neutral-300">{item.demand}/10</strong></span>
                        <span>•</span>
                        {/* Show star overrides if present */}
                        <span className="truncate">
                          {isSoldierDrone ? (
                            item.hasCustomMultiplierOverrides ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">Manual Multipliers Override</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Universal (1x, 5x, 20x, 50x)</span>
                            )
                          ) : (
                            <>Overrides: {item.starTierOverrides && Object.keys(item.starTierOverrides).length > 0 
                              ? Object.entries(item.starTierOverrides).map(([tier, data]) => `${tier}★: ${(data as any)?.demand ?? item.demand}/10`).join(', ')
                              : 'None'}</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Deselect / Include Toggle Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleItemSelection(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-neutral-100 dark:bg-neutral-800 hover:bg-red-500/10 hover:text-red-500 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                          : 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                      }`}
                    >
                      {isSelected ? 'Deselect' : 'Include'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
        </>
      ) : (
        /* GRAPHS & RECENTLY UPDATED MANAGEMENT VIEW */
        <div id="recent-and-graphs-hub" className="space-y-6 animate-fade-in">
          {/* Top Banner & Overview */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-['Chakra_Petch'] font-bold text-base uppercase tracking-wider text-neutral-900 dark:text-white">
                  Valuation Graphs & Recently Updated Hub
                </h3>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl">
                Reset valuation graph curves across the entire catalog to a clean 30-day baseline with zero duplicate dates, reset Recently Updated highlights, or manually customize any item's timestamp and spotlight position.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-xs">
                {items.length} Active Catalog Items
              </span>
            </div>
          </div>

          {/* Section 1: Global Resets (2 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Reset All Graphs */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-['Chakra_Petch'] font-bold text-sm uppercase text-neutral-900 dark:text-white">
                      Reset All Valuation Graphs
                    </h4>
                    <p className="text-xs text-neutral-500">Reset price history to clean baseline (points on changes only)</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                  Global
                </span>
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
                <p>
                  Cleans valuation history graphs for all {items.length} catalog items. Points are recorded only when prices change, with no filler points added per day.
                </p>
                <ul className="list-disc list-inside text-[11px] text-neutral-500 space-y-1">
                  <li>Points are plotted only when values change (never adds a point per day)</li>
                  <li>Eliminates synthetic daily wobbles and keeps history clean and accurate</li>
                  <li>Appends a synchronized audit record for catalog accountability</li>
                </ul>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold uppercase text-neutral-500">
                  Optional Audit Note:
                </label>
                <input
                  type="text"
                  value={ruGlobalGraphNote}
                  onChange={(e) => setRuGlobalGraphNote(e.target.value)}
                  placeholder="e.g., Clean baseline calibration (points on changes only)"
                  className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {!ruIsConfirmingGlobalGraphReset ? (
                <button
                  type="button"
                  onClick={() => setRuIsConfirmingGlobalGraphReset(true)}
                  disabled={ruIsSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Graphs to Clean Baseline</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Rebuild history graphs for all {items.length} items? Points will only be added when changes occur.</span>
                  </div>
                  <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90">
                    This will calibrate historical price points to clean baselines where points are only added when valuations change.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRuIsConfirmingGlobalGraphReset(false)}
                      disabled={ruIsSubmitting}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteGlobalGraphReset}
                      disabled={ruIsSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-['Chakra_Petch'] uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      {ruIsSubmitting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Confirm Rebuild</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Reset All Recently Updated */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-['Chakra_Petch'] font-bold text-sm uppercase text-neutral-900 dark:text-white">
                      Reset All Recently Updated
                    </h4>
                    <p className="text-xs text-neutral-500">Wipe stale updates and restart recently updated reel</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase">
                  Global
                </span>
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
                <p>
                  Resets the `lastUpdated` timestamp across the entire catalog to a clean baseline date in the past, clearing out old recently updated items.
                </p>
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold uppercase text-neutral-500">
                    Select Baseline Date:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[14, 30, 60].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setRuBaselineDaysAgo(days)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          ruBaselineDaysAgo === days
                            ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                            : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {days} Days Ago
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 font-mono">
                Target Timestamp: {new Date(Date.now() - ruBaselineDaysAgo * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </div>

              {!ruIsConfirmingGlobalRuReset ? (
                <button
                  type="button"
                  onClick={() => setRuIsConfirmingGlobalRuReset(true)}
                  disabled={ruIsSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Recently Updated</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Reset timestamps for all {items.length} items?</span>
                  </div>
                  <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90">
                    All items will have their lastUpdated date moved back to {ruBaselineDaysAgo} days ago.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRuIsConfirmingGlobalRuReset(false)}
                      disabled={ruIsSubmitting}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteGlobalRuReset}
                      disabled={ruIsSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-['Chakra_Petch'] uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      {ruIsSubmitting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Confirm Reset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Interactive Manual Adjuster & Live Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel (7 cols): Item Adjuster */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-['Chakra_Petch'] font-bold text-xs">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-['Chakra_Petch'] font-bold text-sm uppercase tracking-wide text-neutral-900 dark:text-white">
                      Manually Adjust Recently Updated
                    </h4>
                  </div>
                  {/* Mode Toggle: Single vs Batch */}
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setRuBatchMode(false)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        !ruBatchMode
                          ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Single Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuBatchMode(true)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        ruBatchMode
                          ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Batch Mode ({ruBatchSelectedIds.size})
                    </button>
                  </div>
                </div>

                {/* Search Bar for Selection */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ruSearchQuery}
                    onChange={(e) => setRuSearchQuery(e.target.value)}
                    placeholder="Search catalog items by name, acronym, category..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none"
                  />
                  {ruSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRuSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Single Item Mode: Selected Item Display & Timestamp Controls */}
                {!ruBatchMode ? (
                  ruSelectedItem ? (
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={getSafeImageUrl(ruSelectedItem.thumbnail)}
                            alt={ruSelectedItem.name}
                            className="w-12 h-12 rounded-xl object-contain bg-neutral-200 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white">
                                {ruSelectedItem.name}
                              </h5>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                {ruSelectedItem.category}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {ruSelectedItem.rarity}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 font-mono mt-0.5">
                              Current Value: ${ruSelectedItem.value.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                            {getRelativeTimeAgo(ruSelectedItem.lastUpdated)}
                          </span>
                          <div className="text-[10px] text-neutral-400 font-mono mt-1">
                            {new Date(ruSelectedItem.lastUpdated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Timestamp Presets */}
                      <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <label className="block text-[11px] font-bold uppercase text-neutral-500 flex items-center justify-between">
                          <span>Set Timestamp To:</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 lowercase">
                            preview: {new Date(ruSelectedTimestamp).toLocaleString()}
                          </span>
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setRuSelectedTimestamp(new Date().toISOString())}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Bump to Top (Right Now)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 3600 * 1000).toISOString())}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                          >
                            1 Hour Ago
                          </button>
                          <button
                            type="button"
                            onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 24 * 3600 * 1000).toISOString())}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                          >
                            Yesterday
                          </button>
                          <button
                            type="button"
                            onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString())}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                          >
                            3 Days Ago
                          </button>
                          <button
                            type="button"
                            onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                          >
                            1 Week Ago
                          </button>
                          <button
                            type="button"
                            onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                          >
                            1 Month Ago
                          </button>
                        </div>

                        {/* Exact Date Picker */}
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[11px] text-neutral-500 shrink-0">Precise Datetime:</span>
                          <input
                            type="datetime-local"
                            value={ruSelectedTimestamp ? new Date(new Date(ruSelectedTimestamp).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setRuSelectedTimestamp(new Date(e.target.value).toISOString());
                              }
                            }}
                            className="px-2.5 py-1 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 font-mono focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Audit Note & Action Buttons */}
                      <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <input
                          type="text"
                          value={ruCustomNote}
                          onChange={(e) => setRuCustomNote(e.target.value)}
                          placeholder="Optional audit log note (e.g. Featured item bump, community report approved)"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 focus:border-emerald-500 focus:outline-none"
                        />

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => handleResetSingleGraph(ruSelectedItem)}
                            className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${ruSingleGraphResetDone ? 'animate-spin' : ''}`} />
                            <span>{ruSingleGraphResetDone ? 'Graph Reset!' : "Reset This Item's Graph"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleApplySingleRu}
                            disabled={ruIsSubmitting}
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            {ruIsSubmitting ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>Apply Timestamp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-2">
                      <Clock className="w-8 h-8 text-neutral-400 mx-auto" />
                      <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        No Item Selected
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Click on any item in the catalog below to inspect and customize its Recently Updated timestamp.
                      </p>
                    </div>
                  )
                ) : (
                  /* Batch Mode Controls */
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                        <span>Batch Target:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {ruBatchSelectedIds.size} items selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newSet = new Set<string>();
                            filteredRuItems.forEach(i => newSet.add(i.id));
                            setRuBatchSelectedIds(newSet);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          Select All ({filteredRuItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRuBatchSelectedIds(new Set())}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Batch Presets */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase text-neutral-500">
                        Set Timestamp For Selected Items:
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setRuSelectedTimestamp(new Date().toISOString())}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Bump to Top (Now)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 3600 * 1000).toISOString())}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                        >
                          1 Hour Ago
                        </button>
                        <button
                          type="button"
                          onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 24 * 3600 * 1000).toISOString())}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                        >
                          Yesterday
                        </button>
                        <button
                          type="button"
                          onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                        >
                          1 Week Ago
                        </button>
                        <button
                          type="button"
                          onClick={() => setRuSelectedTimestamp(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 text-xs font-semibold cursor-pointer"
                        >
                          1 Month Ago
                        </button>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={ruCustomNote}
                        onChange={(e) => setRuCustomNote(e.target.value)}
                        placeholder="Audit reason for batch update..."
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 focus:border-emerald-500 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleApplyBatchRu}
                        disabled={ruIsSubmitting || ruBatchSelectedIds.size === 0}
                        className={`px-5 py-2 rounded-xl text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 shrink-0 transition-all ${
                          ruBatchSelectedIds.size === 0 || ruIsSubmitting
                            ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                        }`}
                      >
                        {ruIsSubmitting ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Update {ruBatchSelectedIds.size} Items</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Catalog Item Browser (Quick Click to Pick) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase text-neutral-500">
                    <span>Select From Catalog ({filteredRuItems.length} items):</span>
                    <span className="font-normal text-[10px]">Click any item to select</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900/40">
                    {filteredRuItems.map(item => {
                      const isSingleSelected = ruSelectedItem?.id === item.id;
                      const isBatchSelected = ruBatchSelectedIds.has(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (ruBatchMode) {
                              setRuBatchSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            } else {
                              setRuSelectedItem(item);
                              setRuSelectedTimestamp(item.lastUpdated || new Date().toISOString());
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer ${
                            (!ruBatchMode && isSingleSelected) || (ruBatchMode && isBatchSelected)
                              ? 'bg-emerald-500/5 dark:bg-emerald-500/10'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {ruBatchMode ? (
                              <div className="shrink-0 text-emerald-600 dark:text-emerald-400">
                                {isBatchSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-neutral-400" />}
                              </div>
                            ) : (
                              <div className={`w-2 h-2 rounded-full shrink-0 ${isSingleSelected ? 'bg-emerald-500' : 'bg-transparent'}`} />
                            )}
                            <img
                              src={getSafeImageUrl(item.thumbnail)}
                              alt={item.name}
                              className="w-7 h-7 rounded-lg object-contain bg-neutral-100 dark:bg-neutral-800 shrink-0"
                            />
                            <div className="min-w-0 truncate">
                              <span className="font-bold text-xs text-neutral-900 dark:text-white truncate block">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {item.category} • ${item.value.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              {getRelativeTimeAgo(item.lastUpdated)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustItemRecentlyUpdated(item.id, new Date().toISOString(), 'Admin 1-click bump to top');
                                confetti({ particleCount: 25, spread: 40, origin: { y: 0.6 } });
                                setLastExecutionResult({
                                  success: true,
                                  count: 1,
                                  message: `Bumped "${item.name}" to top of Recently Updated!`
                                });
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                              title="Bump directly to top right now"
                            >
                              Bump
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel (5 cols): Live Recently Updated Showcase */}
            <div className="lg:col-span-5 space-y-5">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-['Chakra_Petch'] font-bold text-sm uppercase tracking-wide text-neutral-900 dark:text-white">
                      Live Top Recently Updated
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    Active Reel
                  </span>
                </div>

                <p className="text-xs text-neutral-500">
                  Real-time view of the top items appearing in the site's Recently Updated section.
                </p>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-[500px] overflow-y-auto">
                  {topRecentlyUpdatedItems.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                      <Clock className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Recently Updated is currently blank
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 max-w-xs mx-auto">
                        No items will appear until new valuation or price updates occur.
                      </p>
                    </div>
                  ) : (
                    topRecentlyUpdatedItems.slice(0, 15).map((item, idx) => (
                      <div
                        key={item.id}
                        className="py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-850 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-white'
                              : idx === 1
                              ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-white'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                          }`}>
                            #{idx + 1}
                          </span>
                          <img
                            src={getSafeImageUrl(item.thumbnail)}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-contain bg-neutral-100 dark:bg-neutral-800 p-0.5 shrink-0"
                          />
                          <div className="min-w-0 truncate">
                            <span className="font-bold text-xs text-neutral-900 dark:text-white truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {new Date(item.lastUpdated).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {getRelativeTimeAgo(item.lastUpdated)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRuSelectedItem(item);
                              setRuSelectedTimestamp(item.lastUpdated || new Date().toISOString());
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-['Chakra_Petch'] font-black text-base uppercase tracking-wider text-neutral-900 dark:text-white">
                  Confirm Automation Execution
                </h4>
                <p className="text-xs text-neutral-500">
                  Please review the parameters before applying changes to the database.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Target Units:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedItems.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Target Rarities:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedRarities.join(', ') || 'All'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Target Star Levels:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {selectedStarTiers.map(t => t === 'fresh' ? 'Fresh' : `${t}★`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">New Demand Rating:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {targetDemand}/10
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Base Catalog Demand:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {updateBaseDemand ? 'Yes (Will Update)' : 'No (Tier Overrides Only)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Soldiers & Drones:</span>
                <span className={`font-bold ${excludeSoldiersAndDrones && selectedCategory === 'All' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                  {excludeSoldiersAndDrones && selectedCategory === 'All' 
                    ? `Excluded (${excludedSoldiersAndDronesCount} units protected)` 
                    : 'Included'}
                </span>
              </div>
              {excludedItems.length > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold pt-1 border-t border-neutral-200 dark:border-neutral-700/60">
                  <span>Excluded Items ({excludedItems.length}):</span>
                  <span className="truncate max-w-[200px] text-right">
                    {excludedItems.map(i => i.name).slice(0, 3).join(', ')}{excludedItems.length > 3 ? '...' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isExecuting}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="confirm-execute-automation-btn"
                type="button"
                onClick={handleExecuteAutomation}
                disabled={isExecuting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
