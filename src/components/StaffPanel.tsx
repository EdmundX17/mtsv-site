import React, { useState, useRef, useEffect } from 'react';
import { useValueList } from '../context/ValueListContext';
import { ReportedValue, MilitaryItem, ItemCategory, ItemRarity, PriceTrend, StaffMember, StaffRole, StarTier, SoldierDroneStarTier, UniversalStarConfig, UniversalSoldierDroneStarConfig } from '../types';
import { formatMilitaryValue, calculateItemStarValue, parseMilitaryValueInput, getRarityConfig, getTrendConfig, isVehicleCategory, isSoldierOrDroneCategory, shouldSortToTagsCategory, STAR_TIERS, SOLDIER_DRONE_STAR_TIERS, itemHasManualOverrides } from '../utils/formatters';
import { optimizeImage, getSafeImageUrl, isDiscordCdnUrl } from '../utils/imageOptimizer';
import { CloudflareTurnstile } from './CloudflareTurnstile';
import { staffApiFetch } from '../lib/staffApi';
import { 
  ShieldAlert, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Activity, 
  AlertTriangle, 
  Clock, 
  RotateCcw,
  UserCheck,
  LogIn,
  Layers,
  Sparkles,
  Clipboard,
  Upload,
  Crown,
  ShieldCheck,
  UserPlus,
  UserX,
  Users,
  User,
  Shield,
  Star,
  Sliders,
  CheckCircle2,
  Lock,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  ListFilter,
  FileText,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Radio,
  Send,
  Info,
  Zap,
  Download,
  BarChart3,
  Image as ImageIcon,
  Tag,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdminInfoTeamEditor } from './AdminInfoTeamEditor';
import { VehicleImage } from './VehicleImage';
import { BatchImageUploader } from './BatchImageUploader';
import { AdminAutomationTools } from './AdminAutomationTools';
import { DataExportView } from './DataExportView';
import { SiteBackupsManager } from './SiteBackupsManager';
import { ConsultantReviewPanel } from './ConsultantReviewPanel';
import { ErrorBoundary } from './ErrorBoundary';

const CATEGORIES: ItemCategory[] = ['Air', 'Land', 'Naval', 'Soldier', 'Drone', 'Tags', 'Other'];
const RARITIES: ItemRarity[] = ['Limited Edition', 'Exotic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common', 'Event'];
const TRENDS: PriceTrend[] = ['Glazed', 'Rising', 'Stable', 'Dropping', 'Unstable'];
const STAFF_CATALOG_PAGE_SIZE = 20;

export type StaffSortField = 'rarity' | 'demand' | 'trend' | 'value' | 'name' | 'tradeable' | 'manual_override';
export type StaffSortDirection = 'asc' | 'desc';

const RARITY_RANK: Record<ItemRarity, number> = {
  'Limited Edition': 8,
  'Exotic': 7,
  'Legendary': 6,
  'Epic': 5,
  'Rare': 4,
  'Uncommon': 3,
  'Common': 2,
  'Event': 1
};

const getTrendRank = (trend: PriceTrend): number => {
  const norm = String(trend).toLowerCase();
  if (norm === 'glazed' || norm === 'hyped') return 5;
  if (norm === 'rising') return 4;
  if (norm === 'stable') return 3;
  if (norm === 'dropping') return 2;
  return 1;
};

export const StaffPanel: React.FC = () => {
  const {
    isStaffPanelOpen,
    setIsStaffPanelOpen,
    isStaffMode,
    isAdmin,
    isAnalyst,
    canExport,
    activeStaff,
    loginStaff,
    logoutStaff,
    staffMembers,
    addStaffMember,
    updateStaffRole,
    sendStaffPasswordReset,
    changeStaffPassword,
    removeStaffMember,
    reports,
    items,
    acceptReport,
    editAndAcceptReport,
    declineReport,
    updateItem,
    addItem,
    deleteItem,
    auditLogs,
    universalStarConfig,
    updateUniversalStarConfig,
    universalSoldierDroneStarConfig,
    updateUniversalSoldierDroneStarConfig,
    getItemStarValue,
    isConsultant,
    consultantProposals,
    submitConsultantProposal
  } = useValueList();

  const [activeTab, setActiveTab] = useState<'reports' | 'items_manager' | 'universal_stars' | 'add_item' | 'audit_logs' | 'admin_staff' | 'info_team' | 'bulk_images' | 'automations' | 'export_data' | 'backups' | 'consultant_proposals'>('items_manager');
  const [quickEditCommentary, setQuickEditCommentary] = useState('');
  const [newItemCommentary, setNewItemCommentary] = useState('');
  const [reportFilter, setReportFilter] = useState<'pending' | 'accepted' | 'declined' | 'all'>('pending');
  const [itemSearch, setItemSearch] = useState('');
  const [staffCatalogVisibleCount, setStaffCatalogVisibleCount] = useState<number>(STAFF_CATALOG_PAGE_SIZE);

  // Multi-field sorting & Category Filtering in Catalog Editor
  const [staffSortField, setStaffSortField] = useState<StaffSortField>('value');
  const [staffSortDirection, setStaffSortDirection] = useState<StaffSortDirection>('desc');
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<ItemCategory | 'All'>('All');
  const [staffManualOverrideOnly, setStaffManualOverrideOnly] = useState<boolean>(false);

  // Universal Star Config temporary editor state (Vehicles)
  const [tempStarConfig, setTempStarConfig] = useState<UniversalStarConfig>(universalStarConfig);
  const [starSaveSuccess, setStarSaveSuccess] = useState(false);
  const [starAdminError, setStarAdminError] = useState<string | null>(null);

  // Universal Soldier & Drone Multipliers temporary editor state
  const [tempSoldierDroneStarConfig, setTempSoldierDroneStarConfig] = useState<UniversalSoldierDroneStarConfig>(universalSoldierDroneStarConfig);
  const [soldierDroneStarSaveSuccess, setSoldierDroneStarSaveSuccess] = useState(false);
  const [soldierDroneStarAdminError, setSoldierDroneStarAdminError] = useState<string | null>(null);

  // In-Depth Audit Logs Filter & Expand State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<'ALL' | 'MANUAL_EDIT' | 'ITEM_ADDED' | 'ITEM_DELETED' | 'REPORT_ACCEPTED' | 'REPORT_DECLINED'>('ALL');
  const [expandedAuditLogIds, setExpandedAuditLogIds] = useState<Record<string, boolean>>({});

  // Reset catalog pagination when search or filters change
  useEffect(() => {
    setStaffCatalogVisibleCount(STAFF_CATALOG_PAGE_SIZE);
  }, [itemSearch, staffSortField, staffSortDirection, staffCategoryFilter, staffManualOverrideOnly]);

  // Sync tempStarConfig whenever universalStarConfig updates externally
  useEffect(() => {
    setTempStarConfig(universalStarConfig);
  }, [universalStarConfig]);

  // Sync tempSoldierDroneStarConfig whenever universalSoldierDroneStarConfig updates externally
  useEffect(() => {
    setTempSoldierDroneStarConfig(universalSoldierDroneStarConfig);
  }, [universalSoldierDroneStarConfig]);

  // Staff username/password login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Staff Management state
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffLegacyId, setNewStaffLegacyId] = useState('');
  const [newStaffDisplayName, setNewStaffDisplayName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('Staff');
  const [staffFeedback, setStaffFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [oneTimePassword, setOneTimePassword] = useState('');
  const [staffMemberToRemove, setStaffMemberToRemove] = useState<StaffMember | null>(null);

  // Password reset and self-service password change
  const [passwordChangeMember, setPasswordChangeMember] = useState<StaffMember | null>(null);
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetTemporaryPassword, setResetTemporaryPassword] = useState('');
  const [showOwnPasswordChange, setShowOwnPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [ownPasswordFeedback, setOwnPasswordFeedback] = useState('');

  // Editing Report Modal state
  const [editingReport, setEditingReport] = useState<ReportedValue | null>(null);
  const [editRepValue, setEditRepValue] = useState<number>(0);
  const [editRepDemand, setEditRepDemand] = useState<number>(10);
  const [editRepTrend, setEditRepTrend] = useState<PriceTrend>('Rising');
  const [editRepComment, setEditRepComment] = useState<string>('');

  // Declining Report Modal state
  const [decliningReport, setDecliningReport] = useState<ReportedValue | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Insufficient verified market trade evidence.');

  // Quick edit item state
  const [selectedEditItem, setSelectedEditItem] = useState<MilitaryItem | null>(null);
  const [quickEditClipboardStatus, setQuickEditClipboardStatus] = useState('');
  const quickEditFileInputRef = useRef<HTMLInputElement | null>(null);
  const [itemEditForm, setItemEditForm] = useState<{
    name: string;
    acronym: string;
    thumbnail: string;
    value: number | string;
    demand: number;
    trend: PriceTrend;
    notes: string;
    rarity: ItemRarity;
    category: ItemCategory;
    tradeable: boolean;
    hasCustomStarOverrides: boolean;
    starOverrides: { [tier in StarTier]?: number };
    hasCustomMultiplierOverrides: boolean;
    multiplierOverrides: { [tier in SoldierDroneStarTier]?: number };
  }>({
    name: '',
    acronym: '',
    thumbnail: '',
    value: 0,
    demand: 5,
    trend: 'Stable',
    notes: '',
    rarity: 'Common',
    category: 'Land',
    tradeable: true,
    hasCustomStarOverrides: false,
    starOverrides: {},
    hasCustomMultiplierOverrides: false,
    multiplierOverrides: {}
  });

  // Safe item deletion state
  const [itemToDelete, setItemToDelete] = useState<MilitaryItem | null>(null);

  // Add Item form state - scaled to thousands
  const [newItemName, setNewItemName] = useState('');
  const [newItemAcronym, setNewItemAcronym] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('Air');
  const [newItemRarity, setNewItemRarity] = useState<ItemRarity>('Legendary');
  const [newItemValue, setNewItemValue] = useState<string | number>('250k');
  const [newItemDemand, setNewItemDemand] = useState<number>(8);
  const [newItemTrend, setNewItemTrend] = useState<PriceTrend>('Rising');
  const [newItemTradeable, setNewItemTradeable] = useState<boolean>(true);
  const [newItemThumbnail, setNewItemThumbnail] = useState('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemInGameCost, setNewItemInGameCost] = useState('');
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string>('');
  const [showLoginCaptchaError, setShowLoginCaptchaError] = useState<boolean>(false);
  const [loginCaptchaResetKey, setLoginCaptchaResetKey] = useState(0);
  const [isVerifyingLoginCaptcha, setIsVerifyingLoginCaptcha] = useState(false);

  // Webhook Live Testing State
  const [testingWebhook, setTestingWebhook] = useState<'changelog' | 'reports' | null>(null);
  const [webhookTestFeedback, setWebhookTestFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; latency?: number } | null>(null);

  const handleTestWebhook = async (type: 'changelog' | 'reports') => {
    setTestingWebhook(type);
    setWebhookTestFeedback(null);
    try {
      const res = await staffApiFetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          tester: activeStaff ? `${activeStaff.displayName || activeStaff.username} (${activeStaff.role})` : 'Staff Admin'
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookTestFeedback({
          type: 'success',
          message: data.message || `Test ${type} webhook delivered to Discord!`,
          latency: data.latencyMs
        });
      } else {
        setWebhookTestFeedback({
          type: data.configured === false ? 'info' : 'error',
          message: data.message || `Discord webhook test failed. Verify DISCORD_${type.toUpperCase()}_WEBHOOK_URL.`,
          latency: data.latencyMs
        });
      }
    } catch (err: any) {
      setWebhookTestFeedback({
        type: 'error',
        message: `Network request error: ${err?.message || err}`,
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  if (!isStaffPanelOpen) return null;

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const pendingProposalsCount = (consultantProposals || []).filter(p => p && p.status === 'pending').length;

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginFeedback(null);
    if (!loginCaptchaToken) {
      setShowLoginCaptchaError(true);
      setLoginFeedback({
        type: 'error',
        message: 'Cloudflare security verification required. Please click the checkbox to verify you are human.'
      });
      return;
    }
    if (!loginUsername.trim() || !loginPassword) {
      setLoginFeedback({ type: 'error', message: 'Please enter both username and password.' });
      return;
    }
    setIsVerifyingLoginCaptcha(true);
    const result = await loginStaff(loginUsername.trim(), loginPassword, loginCaptchaToken);
    setIsVerifyingLoginCaptcha(false);
    setLoginCaptchaToken('');
    setLoginCaptchaResetKey((key) => key + 1);
    if (result.success) {
      setLoginFeedback({ type: 'success', message: result.message });
      setShowLoginCaptchaError(false);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      setLoginFeedback({ type: 'error', message: result.message });
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFeedback(null);
    setOneTimePassword('');
    if (!newStaffUsername.trim()) {
      setStaffFeedback({ type: 'error', message: 'Please enter a staff username.' });
      return;
    }
    const result = await addStaffMember(
      newStaffUsername.trim(),
      newStaffRole,
      newStaffDisplayName.trim() || undefined,
      newStaffLegacyId || undefined
    );
    if (result.success) {
      setStaffFeedback({ type: 'success', message: result.message });
      setOneTimePassword(result.temporaryPassword || '');
      setNewStaffUsername('');
      setNewStaffLegacyId('');
      setNewStaffDisplayName('');
      setNewStaffRole('Staff');
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}
    } else {
      setStaffFeedback({ type: 'error', message: result.message });
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeMember) return;
    setPasswordChangeFeedback(null);
    const result = await sendStaffPasswordReset(passwordChangeMember.id);
    if (result.success) {
      setPasswordChangeFeedback({ type: 'success', message: result.message });
      setResetTemporaryPassword(result.temporaryPassword || '');
    } else {
      setPasswordChangeFeedback({ type: 'error', message: result.message });
    }
  };

  const handleOwnPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await changeStaffPassword(currentPassword, newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setOwnPasswordFeedback(result.message);
    if (result.success) setShowOwnPasswordChange(false);
  };

  const filteredReports = reports.filter(r => {
    if (reportFilter === 'all') return true;
    if (reportFilter === 'accepted') return r.status === 'accepted' || r.status === 'edited_accepted';
    return r.status === reportFilter;
  });

  const filteredItems = items
    .filter(i => {
      const q = itemSearch.toLowerCase();
      const matchesSearch = 
        !itemSearch.trim() ||
        i.name.toLowerCase().includes(q) ||
        (i.acronym && i.acronym.toLowerCase().includes(q)) ||
        i.category.toLowerCase().includes(q) ||
        i.rarity.toLowerCase().includes(q);
      
      const itemCat = i.category === 'Sea' ? 'Naval' : i.category;
      const targetStaffCat = staffCategoryFilter === 'Sea' ? 'Naval' : staffCategoryFilter;
      const matchesCategory = staffCategoryFilter === 'All' || itemCat === targetStaffCat;
      const matchesOverrideOnly = !staffManualOverrideOnly || itemHasManualOverrides(i);

      return matchesSearch && matchesCategory && matchesOverrideOnly;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (staffSortField === 'manual_override') {
        const aHas = itemHasManualOverrides(a) ? 1 : 0;
        const bHas = itemHasManualOverrides(b) ? 1 : 0;
        if (aHas !== bHas) {
          comparison = aHas - bHas;
        } else {
          comparison = a.value - b.value;
        }
      } else if (staffSortField === 'value') {
        const a0Val = calculateItemStarValue(a, '0', universalStarConfig).totalValue;
        const b0Val = calculateItemStarValue(b, '0', universalStarConfig).totalValue;
        comparison = a0Val - b0Val;
      } else if (staffSortField === 'demand') {
        comparison = a.demand - b.demand;
      } else if (staffSortField === 'trend') {
        const aRank = getTrendRank(a.trend);
        const bRank = getTrendRank(b.trend);
        comparison = aRank - bRank;
      } else if (staffSortField === 'rarity') {
        const aRank = RARITY_RANK[a.rarity] || 0;
        const bRank = RARITY_RANK[b.rarity] || 0;
        comparison = aRank - bRank;
      } else if (staffSortField === 'tradeable') {
        const aTrade = a.tradeable !== false ? 1 : 0;
        const bTrade = b.tradeable !== false ? 1 : 0;
        comparison = aTrade - bTrade;
      } else {
        comparison = a.name.localeCompare(b.name);
      }

      return staffSortDirection === 'desc' ? -comparison : comparison;
    });

  const handleStartEditReport = (r: ReportedValue) => {
    setEditingReport(r);
    setEditRepValue(r.suggestedValue);
    setEditRepDemand(r.suggestedDemand);
    setEditRepTrend(r.suggestedTrend);
    setEditRepComment('Adjusted and approved by staff moderation.');
  };

  const handleSaveEditReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    editAndAcceptReport(editingReport.id, {
      value: editRepValue,
      demand: editRepDemand,
      trend: editRepTrend,
      staffComment: editRepComment
    });
    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch(e) {}
    setEditingReport(null);
  };

  const handleConfirmDecline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningReport) return;
    declineReport(decliningReport.id, declineReason);
    setDecliningReport(null);
  };

  const handleStartEditItem = (item: MilitaryItem) => {
    setSelectedEditItem(item);
    setQuickEditClipboardStatus('');
    const isSoldierDrone = isSoldierOrDroneCategory(item.category, item);
    setItemEditForm({
      name: item.name,
      acronym: item.acronym || '',
      thumbnail: item.thumbnail,
      value: item.value,
      demand: item.demand,
      trend: item.trend,
      notes: item.notes || '',
      rarity: item.rarity,
      category: item.category === 'Sea' ? 'Naval' : item.category,
      tradeable: item.tradeable !== false,
      hasCustomStarOverrides: Boolean(item.hasCustomStarOverrides),
      starOverrides: item.starOverrides || {
        fresh: item.value + (universalStarConfig.fresh || 0),
        '0': item.value + (universalStarConfig['0'] || 0),
        '1': item.value + (universalStarConfig['1'] || 10000),
        '2': item.value + (universalStarConfig['2'] || 25000),
        '3': item.value + (universalStarConfig['3'] || 50000),
        '4': item.value + (universalStarConfig['4'] || 100000),
        '5': item.value + (universalStarConfig['5'] || 60000),
      },
      hasCustomMultiplierOverrides: Boolean(item.hasCustomMultiplierOverrides),
      multiplierOverrides: item.multiplierOverrides || {
        '0': universalSoldierDroneStarConfig['0'] ?? 1,
        '1': universalSoldierDroneStarConfig['1'] ?? 5,
        '2': universalSoldierDroneStarConfig['2'] ?? 20,
        '3': universalSoldierDroneStarConfig['3'] ?? 50,
      }
    });
  };

  const handleSaveUniversalStars = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setStarAdminError('Permission Denied: Only administrators have permission to edit and publish universal star pricing.');
      setTimeout(() => setStarAdminError(null), 5000);
      return;
    }
    updateUniversalStarConfig(tempStarConfig);
    setStarSaveSuccess(true);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch(e) {}
    setTimeout(() => setStarSaveSuccess(false), 3500);
  };

  const handleSaveUniversalSoldierDroneStars = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setSoldierDroneStarAdminError('Permission Denied: Only administrators have permission to edit and publish universal soldier & drone multipliers.');
      setTimeout(() => setSoldierDroneStarAdminError(null), 5000);
      return;
    }
    updateUniversalSoldierDroneStarConfig(tempSoldierDroneStarConfig);
    setSoldierDroneStarSaveSuccess(true);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch(e) {}
    setTimeout(() => setSoldierDroneStarSaveSuccess(false), 3500);
  };

  const handleQuickEditPasteClipboard = async () => {
    try {
      setQuickEditClipboardStatus('Reading clipboard...');
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await clipboardItem.getType(imageType);
          const compressed = await optimizeImage(blob, { maxWidth: 512, maxHeight: 512, quality: 0.85 });
          setItemEditForm(prev => ({ ...prev, thumbnail: compressed }));
          setQuickEditClipboardStatus('Optimized image pasted!');
          setTimeout(() => setQuickEditClipboardStatus(''), 2500);
          return;
        }
      }

      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
        const safeUrl = getSafeImageUrl(text.trim());
        setItemEditForm(prev => ({ ...prev, thumbnail: safeUrl }));
        setQuickEditClipboardStatus(isDiscordCdnUrl(text) ? 'Discord image link secured & cached!' : 'Image URL pasted!');
        setTimeout(() => setQuickEditClipboardStatus(''), 2500);
        return;
      }

      setQuickEditClipboardStatus('No image found in clipboard.');
      setTimeout(() => setQuickEditClipboardStatus(''), 3000);
    } catch (err) {
      setQuickEditClipboardStatus('Clipboard access denied.');
      setTimeout(() => setQuickEditClipboardStatus(''), 3000);
    }
  };

  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditItem) return;
    const isVehicle = isVehicleCategory(itemEditForm.category);
    const isSoldierDrone = isSoldierOrDroneCategory(itemEditForm.category);
    const parsedVal = parseMilitaryValueInput(itemEditForm.value);

    // CONSULTANT PROPOSAL FLOW FOR QUICK EDIT (Commentator Mode)
    if (isConsultant) {
      const diffs: { field: string; label: string; oldValue: any; newValue: any }[] = [];
      if (selectedEditItem.value !== parsedVal) {
        diffs.push({ field: 'value', label: 'Base Value', oldValue: selectedEditItem.value, newValue: parsedVal });
      }
      if (selectedEditItem.demand !== (Number(itemEditForm.demand) || 1)) {
        diffs.push({ field: 'demand', label: 'Demand', oldValue: selectedEditItem.demand, newValue: Number(itemEditForm.demand) || 1 });
      }
      if (selectedEditItem.trend !== itemEditForm.trend) {
        diffs.push({ field: 'trend', label: 'Price Trend', oldValue: selectedEditItem.trend, newValue: itemEditForm.trend });
      }
      if (selectedEditItem.name !== (itemEditForm.name.trim() || selectedEditItem.name)) {
        diffs.push({ field: 'name', label: 'Item Name', oldValue: selectedEditItem.name, newValue: itemEditForm.name.trim() || selectedEditItem.name });
      }
      if (selectedEditItem.category !== itemEditForm.category) {
        diffs.push({ field: 'category', label: 'Category', oldValue: selectedEditItem.category, newValue: itemEditForm.category });
      }
      if (selectedEditItem.rarity !== itemEditForm.rarity) {
        diffs.push({ field: 'rarity', label: 'Rarity', oldValue: selectedEditItem.rarity, newValue: itemEditForm.rarity });
      }
      if (selectedEditItem.tradeable !== itemEditForm.tradeable) {
        diffs.push({ field: 'tradeable', label: 'Tradeable', oldValue: selectedEditItem.tradeable ?? true, newValue: itemEditForm.tradeable });
      }
      if ((selectedEditItem.notes || '') !== itemEditForm.notes) {
        diffs.push({ field: 'notes', label: 'Notes / Insights', oldValue: selectedEditItem.notes || '(Empty)', newValue: itemEditForm.notes || '(Empty)' });
      }

      submitConsultantProposal({
        itemId: selectedEditItem.id,
        itemName: itemEditForm.name.trim() || selectedEditItem.name,
        itemThumbnail: itemEditForm.thumbnail.trim() || selectedEditItem.thumbnail,
        itemCategory: itemEditForm.category,
        itemRarity: itemEditForm.rarity,
        consultantId: activeStaff?.id || 'consultant',
        consultantUsername: activeStaff?.username || 'consultant',
        consultantDisplayName: activeStaff?.displayName || 'Consultant',
        type: 'ITEM_UPDATE',
        commentary: quickEditCommentary.trim() || 'Quick edit valuation recommendation based on trade market verification.',
        proposedChanges: {
          name: itemEditForm.name.trim() || selectedEditItem.name,
          acronym: itemEditForm.acronym.trim() ? itemEditForm.acronym.trim() : undefined,
          thumbnail: itemEditForm.thumbnail.trim() || selectedEditItem.thumbnail,
          value: parsedVal,
          demand: Number(itemEditForm.demand) || 1,
          trend: itemEditForm.trend,
          notes: itemEditForm.notes,
          rarity: itemEditForm.rarity,
          category: itemEditForm.category,
          tradeable: itemEditForm.tradeable,
          hasCustomStarOverrides: isVehicle ? itemEditForm.hasCustomStarOverrides : false,
          starOverrides: isVehicle && itemEditForm.hasCustomStarOverrides ? itemEditForm.starOverrides : undefined,
          hasCustomMultiplierOverrides: isSoldierDrone ? itemEditForm.hasCustomMultiplierOverrides : false,
          multiplierOverrides: isSoldierDrone && itemEditForm.hasCustomMultiplierOverrides ? itemEditForm.multiplierOverrides : undefined,
        },
        originalSnapshot: {
          value: selectedEditItem.value,
          demand: selectedEditItem.demand,
          trend: selectedEditItem.trend,
          notes: selectedEditItem.notes,
          tradeable: selectedEditItem.tradeable
        },
        diffs: diffs.length > 0 ? diffs : [{ field: 'review', label: 'Catalog Verification', oldValue: 'Current Catalog', newValue: 'Verified & Recommended' }]
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#059669']
        });
      } catch(e) {}

      setQuickEditCommentary('');
      setSelectedEditItem(null);
      return;
    }

    updateItem({
      id: selectedEditItem.id,
      name: itemEditForm.name.trim() || selectedEditItem.name,
      acronym: itemEditForm.acronym.trim() ? itemEditForm.acronym.trim() : undefined,
      thumbnail: itemEditForm.thumbnail.trim() || selectedEditItem.thumbnail,
      value: parsedVal,
      demand: Number(itemEditForm.demand) || 1,
      trend: itemEditForm.trend,
      notes: itemEditForm.notes,
      rarity: itemEditForm.rarity,
      category: itemEditForm.category,
      tradeable: itemEditForm.tradeable,
      hasCustomStarOverrides: isVehicle ? itemEditForm.hasCustomStarOverrides : false,
      starOverrides: isVehicle && itemEditForm.hasCustomStarOverrides ? itemEditForm.starOverrides : undefined,
      hasCustomMultiplierOverrides: isSoldierDrone ? itemEditForm.hasCustomMultiplierOverrides : false,
      multiplierOverrides: isSoldierDrone && itemEditForm.hasCustomMultiplierOverrides ? itemEditForm.multiplierOverrides : undefined,
      starTierOverrides: (isVehicle && !itemEditForm.hasCustomStarOverrides) || (isSoldierDrone && !itemEditForm.hasCustomMultiplierOverrides)
        ? undefined
        : selectedEditItem.starTierOverrides
    }, 'Manual staff panel item adjustment');
    
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#ea580c']
      });
    } catch(e) {}

    setSelectedEditItem(null);
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const parsedVal = parseMilitaryValueInput(newItemValue);

    // CONSULTANT PROPOSAL FLOW FOR NEW ITEM (Commentator Mode)
    if (isConsultant) {
      submitConsultantProposal({
        itemName: newItemName.trim(),
        itemThumbnail: newItemThumbnail.trim() || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
        itemCategory: newItemCategory,
        itemRarity: newItemRarity,
        consultantId: activeStaff?.id || 'consultant',
        consultantUsername: activeStaff?.username || 'consultant',
        consultantDisplayName: activeStaff?.displayName || 'Consultant',
        type: 'NEW_ITEM',
        commentary: newItemCommentary.trim() || 'Proposed new unit catalog entry submission.',
        proposedChanges: {
          name: newItemName.trim(),
          acronym: newItemAcronym.trim() ? newItemAcronym.trim() : undefined,
          category: newItemCategory,
          rarity: newItemRarity,
          value: parsedVal,
          demand: newItemDemand,
          trend: newItemTrend,
          tradeable: newItemTradeable,
          thumbnail: newItemThumbnail.trim() || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
          notes: newItemNotes.trim() || 'Recently cataloged unit.',
          inGameCost: newItemInGameCost.trim() || undefined,
        },
        diffs: [
          { field: 'newItem', label: 'New Unit Catalog Entry', oldValue: '(Does not exist)', newValue: `${newItemName.trim()} (${newItemCategory}, ${newItemRarity})` },
          { field: 'value', label: 'Proposed Value', oldValue: 'None', newValue: parsedVal },
          { field: 'demand', label: 'Proposed Demand', oldValue: 'None', newValue: newItemDemand },
        ],
        originalSnapshot: {
          value: 0,
          demand: 0,
          trend: 'Stable',
          notes: '',
          tradeable: true
        }
      });

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 }, colors: ['#10b981', '#34d399'] });
      } catch(e) {}

      setNewItemName('');
      setNewItemAcronym('');
      setNewItemNotes('');
      setNewItemInGameCost('');
      setNewItemCommentary('');
      setActiveTab('consultant_proposals');
      return;
    }

    addItem({
      name: newItemName.trim(),
      acronym: newItemAcronym.trim() ? newItemAcronym.trim() : undefined,
      category: newItemCategory,
      rarity: newItemRarity,
      value: parsedVal,
      demand: newItemDemand,
      trend: newItemTrend,
      tradeable: newItemTradeable,
      thumbnail: newItemThumbnail.trim() || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
      notes: newItemNotes.trim() || 'Recently cataloged item.',
      inGameCost: newItemInGameCost.trim() || undefined,
      initialHistoryNote: 'Catalog addition'
    });

    setNewItemName('');
    setNewItemAcronym('');

    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
    } catch(e) {}

    // Reset form
    setNewItemName('');
    setNewItemNotes('');
    setNewItemInGameCost('');
    setNewItemTradeable(true);
    setActiveTab('items_manager');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#141722] backdrop-blur-2xl border border-orange-200/80 dark:border-neutral-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[94vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-b border-orange-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Chakra_Petch'] text-xl font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                  Staff Management Portal
                </h3>
                {isStaffMode && (
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold font-mono flex items-center gap-1 ${
                    isAdmin
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                      : isAnalyst
                      ? 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300'
                      : isConsultant
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                      : 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                  }`}>
                    {isAdmin ? (
                      <Crown className="w-3 h-3 text-amber-500" />
                    ) : isAnalyst ? (
                      <BarChart3 className="w-3 h-3 text-cyan-500" />
                    ) : isConsultant ? (
                      <MessageSquare className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-blue-500" />
                    )}
                    {activeStaff?.role?.toUpperCase() || 'STAFF'}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
                {isStaffMode 
                  ? `${activeStaff?.role}: ${activeStaff?.displayName || activeStaff?.username} • Value & Report Controls`
                  : 'Restricted Access • Staff Credentials Required'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isStaffMode && (
              <button
                onClick={() => { setShowOwnPasswordChange(true); setOwnPasswordFeedback(''); }}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Change Password
              </button>
            )}
            {isStaffMode && (
              <button
                onClick={logoutStaff}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Log Out
              </button>
            )}
            <button
              onClick={() => setIsStaffPanelOpen(false)}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Staff username/password authentication */}
        {!isStaffMode ? (
          <div className="p-6 sm:p-10 flex items-center justify-center flex-1 overflow-y-auto">
            <div className="w-full max-w-md bg-white dark:bg-[#181c2b] border border-orange-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-2 border border-orange-200 dark:border-orange-900/60 shadow-sm">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="font-['Chakra_Petch'] text-xl font-bold text-neutral-900 dark:text-white">
                  Staff Portal Login
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Enter your staff username and password.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleStaffLogin} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold font-mono uppercase text-neutral-700 dark:text-neutral-300">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="staffname"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold font-mono uppercase text-neutral-700 dark:text-neutral-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {loginFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                      loginFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {loginFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{loginFeedback.message}</span>
                  </div>
                )}

                {/* Cloudflare Turnstile */}
                <div className="pt-1">
                  <CloudflareTurnstile
                    onVerify={(token) => {
                      setLoginCaptchaToken(token);
                      setShowLoginCaptchaError(false);
                    }}
                    onExpire={() => setLoginCaptchaToken('')}
                    theme="auto"
                    isInvalid={Boolean(showLoginCaptchaError && !loginCaptchaToken)}
                    resetKey={loginCaptchaResetKey}
                  />
                  {showLoginCaptchaError && !loginCaptchaToken && (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Cloudflare verification required to authenticate</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!loginCaptchaToken || isVerifyingLoginCaptcha}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                    loginCaptchaToken && !isVerifyingLoginCaptcha
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20 cursor-pointer active:scale-[0.98]'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none border border-neutral-300 dark:border-neutral-700'
                  }`}
                  title={isVerifyingLoginCaptcha ? 'Checking Cloudflare verification…' : !loginCaptchaToken ? 'Complete Cloudflare verification first' : 'Authenticate & Enter Portal'}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isVerifyingLoginCaptcha ? 'Checking verification…' : loginCaptchaToken ? 'Authenticate & Enter Portal' : 'Verify Cloudflare to Enter'}</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation - Fixed & Uncut */}
            <div className="bg-orange-50/70 dark:bg-neutral-900/90 border-b border-orange-100 dark:border-neutral-800 px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 overflow-x-auto shrink-0 z-10">
              <button
                id="staff-tab-items"
                onClick={() => setActiveTab('items_manager')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'items_manager'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                    : 'bg-white dark:bg-neutral-800/80 border-orange-200/60 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-neutral-600'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Catalog Editor ({items.length})</span>
              </button>

              <button
                id="staff-tab-universal-stars"
                onClick={() => setActiveTab('universal_stars')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'universal_stars'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                    : 'bg-white dark:bg-neutral-800/80 border-orange-200/60 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-neutral-600'
                }`}
              >
                <Star className="w-4 h-4 text-amber-300" />
                <span>Universal Star Pricing</span>
              </button>

              <button
                id="staff-tab-add"
                onClick={() => setActiveTab('add_item')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'add_item'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                    : 'bg-white dark:bg-neutral-800/80 border-orange-200/60 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-neutral-600'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Item</span>
              </button>

              <button
                id="staff-tab-reports"
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'reports'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                    : 'bg-white dark:bg-neutral-800/80 border-orange-200/60 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-neutral-600'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Reports Queue</span>
                {pendingCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'reports' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* CONSULTANT PROPOSALS TAB */}
              <button
                id="staff-tab-consultant-proposals"
                onClick={() => setActiveTab('consultant_proposals')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'consultant_proposals'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:border-emerald-400'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>{isConsultant ? 'My Suggestions' : 'Consultant Proposals'}</span>
                {pendingProposalsCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'consultant_proposals' ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-white animate-pulse'
                  }`}>
                    {pendingProposalsCount}
                  </span>
                )}
              </button>

              <button
                id="staff-tab-audit"
                onClick={() => setActiveTab('audit_logs')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'audit_logs'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                    : 'bg-white dark:bg-neutral-800/80 border-orange-200/60 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-neutral-600'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Audit Logs</span>
              </button>

              {/* EXPORT DATA TAB (ANALYST & ADMIN) */}
              <button
                id="staff-tab-export-data"
                onClick={() => setActiveTab('export_data')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'export_data'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-500 shadow-sm shadow-cyan-500/30'
                    : canExport
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300/80 dark:border-cyan-700/60 text-cyan-900 dark:text-cyan-300 hover:border-cyan-400 dark:hover:border-cyan-500'
                    : 'bg-neutral-100 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500'
                }`}
              >
                <Download className={`w-4 h-4 ${canExport ? 'text-cyan-500 dark:text-cyan-400' : 'text-neutral-400'}`} />
                <span>Export Data {canExport ? `(${isAdmin ? 'Admin' : 'Analyst'})` : ''}</span>
                {!canExport && <Lock className="w-3 h-3 text-neutral-400 ml-0.5" />}
              </button>

              {/* ADMIN ONLY TABS */}
              {isAdmin && (
                <button
                  key="staff-tab-backups"
                  id="staff-tab-backups"
                  onClick={() => setActiveTab('backups')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                    activeTab === 'backups'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-300 hover:border-emerald-400 dark:hover:border-emerald-500'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span>Site Backups & Disaster Recovery (Admin)</span>
                </button>
              )}

              {isAdmin && (
                <button
                  key="staff-tab-automations"
                  id="staff-tab-automations"
                  onClick={() => setActiveTab('automations')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                    activeTab === 'automations'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-300 hover:border-emerald-400 dark:hover:border-emerald-500'
                  }`}
                >
                  <Zap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span>Automation Tools (Admin)</span>
                </button>
              )}

              {isAdmin && (
                <button
                  key="staff-tab-bulk-images"
                  id="staff-tab-bulk-images"
                  onClick={() => setActiveTab('bulk_images')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                    activeTab === 'bulk_images'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                      : 'bg-orange-50 dark:bg-orange-950/40 border-orange-300/80 dark:border-orange-700/60 text-orange-900 dark:text-orange-300 hover:border-orange-400 dark:hover:border-orange-500'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  <span>Bulk Image Uploader (Admin)</span>
                </button>
              )}

              {isAdmin && (
                <button
                  key="staff-tab-info-team"
                  id="staff-tab-info-team"
                  onClick={() => setActiveTab('info_team')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                    activeTab === 'info_team'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-sm shadow-purple-500/30'
                      : 'bg-purple-50 dark:bg-purple-950/40 border-purple-300/80 dark:border-purple-700/60 text-purple-900 dark:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500'
                  }`}
                >
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Edit Info & Our Team</span>
                </button>
              )}

              {isAdmin && (
                <button
                  key="staff-tab-admin-roster"
                  id="staff-tab-admin-roster"
                  onClick={() => setActiveTab('admin_staff')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                    activeTab === 'admin_staff'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-sm shadow-amber-500/30'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 hover:border-amber-400 dark:hover:border-amber-500'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Staff Roster ({staffMembers.length})</span>
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB: INFO & TEAM EDITOR */}
              {activeTab === 'info_team' && (
                <AdminInfoTeamEditor />
              )}
              {/* TAB: ITEMS MANAGER */}
              {activeTab === 'items_manager' && (
                <div className="space-y-4">
                  {/* Top Bar: Search, Add Item */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="text"
                        placeholder="Search items by name, acronym, category, or rarity..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2 bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                      />
                      {itemSearch && (
                        <button
                          type="button"
                          onClick={() => setItemSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveTab('add_item')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Item</span>
                    </button>
                  </div>

                  {/* Category Filter Pills & Overrides Filter */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1 shrink-0 mr-1">
                      <Filter className="w-3 h-3" /> Category:
                    </span>
                    {(['All', ...CATEGORIES] as const).map((cat) => {
                      const isSelected = staffCategoryFilter === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setStaffCategoryFilter(cat)}
                          className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                              : 'bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-orange-300 dark:hover:border-neutral-600'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}

                    <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />

                    {/* Manual Override Only Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setStaffManualOverrideOnly(prev => !prev)}
                      className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs flex items-center gap-1.5 ${
                        staffManualOverrideOnly
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20 ring-1 ring-amber-400'
                          : 'bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-amber-400 dark:hover:border-amber-500'
                      }`}
                      title="Filter only items that have manual star overrides activated"
                    >
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>Overrides Only</span>
                      {staffManualOverrideOnly && <Check className="w-3 h-3 text-white ml-0.5" />}
                    </button>
                  </div>

                  {/* Multi-Field Sorting Bar */}
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-mono mr-1">
                        Sort By:
                      </span>

                      {([
                        { id: 'manual_override', label: 'Manual Override', icon: '⚡' },
                        { id: 'rarity', label: 'Rarity', icon: '👑' },
                        { id: 'demand', label: 'Demand', icon: '🔥' },
                        { id: 'trend', label: 'Trend', icon: '📈' },
                        { id: 'value', label: 'Value', icon: '💎' },
                        { id: 'name', label: 'Name', icon: '🔤' },
                        { id: 'tradeable', label: 'Tradeable', icon: '🔄' },
                      ] as const).map((field) => {
                        const isActive = staffSortField === field.id;
                        return (
                          <button
                            key={field.id}
                            type="button"
                            onClick={() => {
                              if (staffSortField === field.id) {
                                // Toggle direction if clicking same active field
                                setStaffSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                              } else {
                                setStaffSortField(field.id);
                                // Default desc for value/demand/rarity/trend/manual_override, asc for name
                                setStaffSortDirection(field.id === 'name' ? 'asc' : 'desc');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                                : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-300 dark:hover:border-neutral-600'
                            }`}
                          >
                            <span>{field.icon}</span>
                            <span>{field.label}</span>
                            {isActive && (
                              <span className="ml-0.5">
                                {staffSortDirection === 'desc' ? (
                                  <ArrowDown className="w-3 h-3 text-white" />
                                ) : (
                                  <ArrowUp className="w-3 h-3 text-white" />
                                )}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Direction Toggle Control */}
                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setStaffSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 text-neutral-700 dark:text-neutral-200 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                        title="Toggle Sort Direction"
                      >
                        {staffSortDirection === 'desc' ? (
                          <>
                            <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
                            <span>Desc (High to Low)</span>
                          </>
                        ) : (
                          <>
                            <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
                            <span>Asc (Low to High)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 dark:text-neutral-400 space-y-2">
                      <p>No items match the search or filter criteria.</p>
                      <div className="flex justify-center gap-2 pt-1">
                        <button
                          onClick={() => { setItemSearch(''); setStaffCategoryFilter('All'); }}
                          className="px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Clear Filters
                        </button>
                        <button
                          onClick={() => setActiveTab('add_item')}
                          className="px-4 py-1.5 bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900/60 text-orange-800 dark:text-orange-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredItems.slice(0, staffCatalogVisibleCount).map((item, itemIdx) => {
                          const isUntradeable = item.tradeable === false;
                          const rarityCfg = getRarityConfig(item.rarity);
                          const trendCfg = getTrendConfig(item.trend);

                          return (
                            <div 
                              key={item.id || `staff-item-${item.name}-${itemIdx}`} 
                              className={`p-3.5 rounded-2xl bg-white dark:bg-[#181c2b] shadow-sm flex flex-col justify-between gap-3 transition-all border ${
                                isUntradeable
                                  ? 'border-orange-500/80 dark:border-orange-500/80 bg-orange-500/[0.02]'
                                  : 'border-orange-100 dark:border-neutral-800 hover:border-orange-200 dark:hover:border-neutral-700'
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-orange-100 dark:border-neutral-700 p-1 flex items-center justify-center">
                                  <VehicleImage 
                                    src={item.thumbnail} 
                                    alt={item.name} 
                                    category={item.category}
                                    className="w-full h-full object-contain" 
                                  />
                                  {isUntradeable && (
                                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-orange-500 text-white text-[8px] font-black font-mono tracking-wider shadow-sm z-10">
                                      NO TRADE
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white truncate">
                                      {item.name}
                                    </span>
                                    {item.acronym && (
                                      <span className="px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-mono font-bold uppercase">
                                        {item.acronym}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                    <span className={`px-2 py-0.5 rounded-md font-bold ${rarityCfg.bg} ${rarityCfg.textClass} border ${rarityCfg.border}`}>
                                      {item.rarity}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 font-medium">
                                      {item.category}
                                    </span>
                                    {itemHasManualOverrides(item) && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
                                        <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                        <span>Override</span>
                                      </span>
                                    )}
                                    {isUntradeable && (
                                      <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-bold border border-orange-300 dark:border-orange-700">
                                        Untradeable
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between pt-0.5">
                                    <div className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                                      {formatMilitaryValue(item.value)}
                                    </div>
                                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono flex items-center gap-1">
                                      <span>🔥 {item.demand}/10</span>
                                      <span>•</span>
                                      <span className={trendCfg.textColor}>{item.trend}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card Action Controls */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateItem({
                                      ...item,
                                      tradeable: item.tradeable === false ? true : false
                                    }, `Staff tradeability toggled to ${item.tradeable === false ? 'Tradeable' : 'Untradeable'}`);
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                                    isUntradeable
                                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                  }`}
                                  title="Quick toggle tradeability status"
                                >
                                  <span>🔄</span>
                                  <span>{isUntradeable ? 'Make Tradeable' : 'Make Untradeable'}</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartEditItem(item)}
                                    className="p-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 cursor-pointer transition-colors"
                                    title="Edit Item"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {isVehicleCategory(item.category) && !isAdmin ? (
                                    <button
                                      disabled
                                      className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed transition-colors"
                                      title="Vehicles can only be deleted by Admin"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setItemToDelete(item)}
                                      className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                                      title="Delete Item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Controls for Staff Catalog Editor (20 cards per batch) */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                          Showing <span className="font-bold text-neutral-800 dark:text-neutral-200">{Math.min(staffCatalogVisibleCount, filteredItems.length)}</span> of <span className="font-bold text-neutral-800 dark:text-neutral-200">{filteredItems.length}</span> items (20 per page)
                        </div>

                        {staffCatalogVisibleCount < filteredItems.length && (
                          <button
                            type="button"
                            onClick={() => setStaffCatalogVisibleCount(prev => prev + STAFF_CATALOG_PAGE_SIZE)}
                            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Load Next 20 Items ({filteredItems.length - staffCatalogVisibleCount} remaining)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: UNIVERSAL STAR PRICING (AIR, NAVAL, LAND) */}
              {activeTab === 'universal_stars' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Header Banner */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200 dark:border-orange-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-orange-500 text-white shadow-sm">
                          <Star className="w-4 h-4" />
                        </div>
                        <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                          Universal Vehicle Star Pricing
                        </h4>
                        {isAdmin ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-500" /> Admin Authorized
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold font-mono flex items-center gap-1">
                            <Lock className="w-3 h-3 text-neutral-500" /> Read Only (Admins Only)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed">
                        Configure global tier increments applied across all vehicle categories (<strong className="text-neutral-800 dark:text-neutral-200">Air, Naval, Land</strong>). If a 5★ value is set to +60,000, any vehicle with a base value of 100k will automatically be valued at 160k at 5★ (unless manually overridden per item in the editor).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempStarConfig({
                              fresh: 0,
                              '0': 0,
                              '1': 10000,
                              '2': 25000,
                              '3': 50000,
                              '4': 100000,
                              '5': 60000
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Reset Defaults
                        </button>
                      )}
                    </div>
                  </div>

                  {!isAdmin && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2.5 shadow-sm">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span><strong>Admin Access Only:</strong> You are currently logged in as Staff. Only Administrators have permission to edit and save universal star pricing configurations.</span>
                    </div>
                  )}

                  {starAdminError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>{starAdminError}</span>
                    </div>
                  )}

                  {starSaveSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Universal Star Pricing configuration successfully saved and applied to all vehicle cards!</span>
                    </div>
                  )}

                  {/* 7 Star Tier Form Inputs (Fresh, 0*, 1*, 2*, 3*, 4*, 5*) */}
                  <form onSubmit={handleSaveUniversalStars} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {STAR_TIERS.map((tier, tierIdx) => (
                        <div
                          key={tier.id || `star-tier-${tierIdx}`}
                          className="p-4 rounded-2xl bg-white dark:bg-[#181c2b] border border-orange-100 dark:border-neutral-800 shadow-sm space-y-3 transition-all hover:border-orange-300 dark:hover:border-neutral-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/80 flex items-center justify-center font-bold font-mono text-xs text-orange-600 dark:text-orange-400">
                                {tier.shortLabel}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-neutral-900 dark:text-white font-['Chakra_Petch']">
                                  {tier.label}
                                </div>
                                <div className="text-[10px] text-neutral-400">
                                  Vehicle star rank
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              Tier {tier.id}
                            </span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                              Universal Bonus Addition ($)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400">
                                +$
                              </span>
                              <input
                                type="text"
                                disabled={!isAdmin}
                                value={tempStarConfig[tier.id] ?? 0}
                                onChange={(e) => {
                                  if (!isAdmin) return;
                                  const val = parseMilitaryValueInput(e.target.value);
                                  setTempStarConfig(prev => ({
                                    ...prev,
                                    [tier.id]: val
                                  }));
                                }}
                                placeholder="e.g. 10k, 25k, 50k"
                                className={`w-full pl-8 pr-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none ${
                                  !isAdmin 
                                    ? 'opacity-60 cursor-not-allowed border-neutral-200 dark:border-neutral-800' 
                                    : 'border-neutral-200 dark:border-neutral-700'
                                }`}
                              />
                            </div>
                          </div>

                          <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-neutral-400">Sample for 100k item:</span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">
                              {formatMilitaryValue(100000 + (tempStarConfig[tier.id] ?? 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live Preview Simulation */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-orange-100 dark:border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase">
                          Live Vehicle Tier Scaling Matrix
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          Applies to Air, Naval & Land Vehicles
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                              <th className="py-2 pr-3">Vehicle</th>
                              <th className="py-2 px-2 text-center">Category</th>
                              <th className="py-2 px-2 text-right">Default Value</th>
                              <th className="py-2 px-2 text-right">Fresh (+💎 {(tempStarConfig.fresh || 0).toLocaleString()})</th>
                              <th className="py-2 px-2 text-right">0★ (+💎 {(tempStarConfig['0'] || 0).toLocaleString()})</th>
                              <th className="py-2 px-2 text-right">1★ (+💎 {(tempStarConfig['1'] || 0).toLocaleString()})</th>
                              <th className="py-2 px-2 text-right">2★ (+💎 {(tempStarConfig['2'] || 0).toLocaleString()})</th>
                              <th className="py-2 px-2 text-right">3★ (+💎 {(tempStarConfig['3'] || 0).toLocaleString()})</th>
                              <th className="py-2 px-2 text-right">4★ (+💎 {(tempStarConfig['4'] || 0).toLocaleString()})</th>
                              <th className="py-2 pl-2 text-right text-orange-600 dark:text-orange-400 font-bold">5★ (+💎 {(tempStarConfig['5'] || 0).toLocaleString()})</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                            {items.filter(i => isVehicleCategory(i.category)).slice(0, 5).map((vehicle, vehIdx) => (
                              <tr key={vehicle.id || `veh-preview-${vehIdx}`} className="hover:bg-orange-50/40 dark:hover:bg-neutral-800/30">
                                <td className="py-2.5 pr-3 font-bold text-neutral-900 dark:text-white font-sans">
                                  {vehicle.name}
                                  {vehicle.acronym && (
                                    <span className="ml-1 text-[10px] text-orange-500 font-mono">({vehicle.acronym})</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-400 font-sans">
                                    {vehicle.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-right text-neutral-500">
                                  {formatMilitaryValue(vehicle.value)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                  {formatMilitaryValue(vehicle.value + (tempStarConfig.fresh || 0))}
                                </td>
                                <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                  {formatMilitaryValue(vehicle.value + (tempStarConfig['0'] || 0))}
                                </td>
                                <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                  {formatMilitaryValue(vehicle.value + (tempStarConfig['1'] || 0))}
                                </td>
                                <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                  {formatMilitaryValue(vehicle.value + (tempStarConfig['2'] || 0))}
                                </td>
                                <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                  {formatMilitaryValue(vehicle.value + (tempStarConfig['3'] || 0))}
                                </td>
                                <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                  {formatMilitaryValue(vehicle.value + (tempStarConfig['4'] || 0))}
                                </td>
                                <td className="py-2.5 pl-2 text-right font-bold text-orange-600 dark:text-orange-400">
                                  {formatMilitaryValue(vehicle.value + (tempStarConfig['5'] || 0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      {isAdmin ? (
                        <button
                          type="submit"
                          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 cursor-pointer flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save & Publish Universal Vehicle Star Pricing</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-xs font-mono">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Admin privileges required to save changes</span>
                        </div>
                      )}
                    </div>
                  </form>

                  {/* SECTION 2: SOLDIER & DRONE UNIVERSAL STAR MULTIPLIERS (0*, 1*, 2*, 3*) */}
                  <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
                    {/* Header Banner */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-sm">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                            Universal Soldier & Drone Multipliers
                          </h4>
                          {isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono flex items-center gap-1">
                              <Crown className="w-3 h-3 text-emerald-500" /> Admin Authorized
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold font-mono flex items-center gap-1">
                              <Lock className="w-3 h-3 text-neutral-500" /> Read Only (Admins Only)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed">
                          Configure global multiplier tiers applied to <strong className="text-neutral-800 dark:text-neutral-200">Soldiers and Drones (0★ up to 3★)</strong>. Unlike the additive vehicle star system, Soldier & Drone stars multiply the base value (e.g., if 2★ is set to 20x, a 100k soldier is valued at 2.0M at 2★).
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setTempSoldierDroneStarConfig({
                                '0': 1,
                                '1': 5,
                                '2': 20,
                                '3': 50
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Reset Defaults
                          </button>
                        )}
                      </div>
                    </div>

                    {soldierDroneStarAdminError && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>{soldierDroneStarAdminError}</span>
                      </div>
                    )}

                    {soldierDroneStarSaveSuccess && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Universal Soldier & Drone multipliers successfully saved and applied!</span>
                      </div>
                    )}

                    {/* 4 Multiplier Tier Form Inputs (0*, 1*, 2*, 3*) */}
                    <form onSubmit={handleSaveUniversalSoldierDroneStars} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SOLDIER_DRONE_STAR_TIERS.map((tier, tierIdx) => (
                          <div
                            key={tier.id || `sd-tier-${tierIdx}`}
                            className="p-4 rounded-2xl bg-white dark:bg-[#181c2b] border border-emerald-100 dark:border-neutral-800 shadow-sm space-y-3 transition-all hover:border-emerald-300 dark:hover:border-neutral-700"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                  {tier.shortLabel}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-neutral-900 dark:text-white font-['Chakra_Petch']">
                                    {tier.label}
                                  </div>
                                  <div className="text-[10px] text-neutral-400">
                                    Soldier/Drone tier
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                Tier {tier.id}★
                              </span>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                                Multiplier Factor (x)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  disabled={!isAdmin}
                                  value={tempSoldierDroneStarConfig[tier.id] ?? 1}
                                  onChange={(e) => {
                                    if (!isAdmin) return;
                                    const val = Number(e.target.value);
                                    setTempSoldierDroneStarConfig(prev => ({
                                      ...prev,
                                      [tier.id]: val
                                    }));
                                  }}
                                  placeholder="e.g. 1, 5, 20, 50"
                                  className={`w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none ${
                                    !isAdmin 
                                      ? 'opacity-60 cursor-not-allowed border-neutral-200 dark:border-neutral-800' 
                                      : 'border-neutral-200 dark:border-neutral-700'
                                  }`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ×
                                </span>
                              </div>
                            </div>

                            <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-neutral-400">Sample for 100k item:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMilitaryValue(100000 * (tempSoldierDroneStarConfig[tier.id] ?? 1))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Live Preview Simulation for Soldier & Drone */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-emerald-100 dark:border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase">
                            Live Soldier & Drone Multiplier Scaling Matrix
                          </div>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            Applies to Soldier & Drone Items (0★ to 3★)
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                                <th className="py-2 pr-3">Soldier / Drone</th>
                                <th className="py-2 px-2 text-center">Category</th>
                                <th className="py-2 px-2 text-right">Base (0★ Multiplier: {tempSoldierDroneStarConfig['0'] || 1}x)</th>
                                <th className="py-2 px-2 text-right">1★ ({tempSoldierDroneStarConfig['1'] || 5}x)</th>
                                <th className="py-2 px-2 text-right">2★ ({tempSoldierDroneStarConfig['2'] || 20}x)</th>
                                <th className="py-2 pl-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">3★ ({tempSoldierDroneStarConfig['3'] || 50}x)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                              {items.filter(i => isSoldierOrDroneCategory(i.category)).slice(0, 6).map((item, sdPrevIdx) => {
                                const baseVal = item.value;
                                return (
                                  <tr key={item.id || `sd-preview-${sdPrevIdx}`} className="hover:bg-emerald-50/40 dark:hover:bg-neutral-800/30">
                                    <td className="py-2.5 pr-3 font-bold text-neutral-900 dark:text-white font-sans">
                                      {item.name}
                                      {item.acronym && (
                                        <span className="ml-1 text-[10px] text-emerald-500 font-mono">({item.acronym})</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-sans border border-emerald-200 dark:border-emerald-800/60">
                                        {item.category}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-neutral-600 dark:text-neutral-400 font-bold">
                                      {formatMilitaryValue(baseVal * (tempSoldierDroneStarConfig['0'] ?? 1))}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                      {formatMilitaryValue(baseVal * (tempSoldierDroneStarConfig['1'] ?? 5))}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                                      {formatMilitaryValue(baseVal * (tempSoldierDroneStarConfig['2'] ?? 20))}
                                    </td>
                                    <td className="py-2.5 pl-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatMilitaryValue(baseVal * (tempSoldierDroneStarConfig['3'] ?? 50))}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        {isAdmin ? (
                          <button
                            type="submit"
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save & Publish Universal Soldier & Drone Multipliers</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-xs font-mono">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Admin privileges required to save changes</span>
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB: ADD ITEM */}
              {activeTab === 'add_item' && (
                <form onSubmit={handleAddNewItem} className="max-w-2xl mx-auto bg-white dark:bg-[#181c2b] border border-orange-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white">
                      {isConsultant ? 'Suggest New Item Catalog Entry' : 'Add New Item to Catalog'}
                    </h4>
                    {isConsultant && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Consultant Mode
                      </span>
                    )}
                  </div>

                  {isConsultant && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                      <div className="p-1.5 rounded-xl bg-emerald-500 text-white shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                        <span className="font-bold block uppercase tracking-wide">Commentator Suggestion</span>
                        As a Consultant, submitting this new item will construct a detailed proposal report and send it to the Administrator Proposals Panel for 1-click verification before it enters the public index.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Item Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AC-130 Gunship"
                        value={newItemName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewItemName(val);
                          if (shouldSortToTagsCategory({ name: val })) {
                            setNewItemCategory('Tags');
                          }
                        }}
                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                        Acronym <span className="text-[10px] font-normal text-neutral-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AC130, Abrams"
                        value={newItemAcronym}
                        onChange={(e) => setNewItemAcronym(e.target.value)}
                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-mono text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Thumbnail URL</label>
                      <input
                        type="url"
                        value={newItemThumbnail}
                        onChange={(e) => setNewItemThumbnail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Category</label>
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as ItemCategory)}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Rarity</label>
                      <select
                        value={newItemRarity}
                        onChange={(e) => setNewItemRarity(e.target.value as ItemRarity)}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none"
                      >
                        {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Trend</label>
                      <select
                        value={newItemTrend}
                        onChange={(e) => setNewItemTrend(e.target.value as PriceTrend)}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none"
                      >
                        {TRENDS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                        Initial Value (Gems 💎): {formatMilitaryValue(newItemValue)}
                      </label>
                      <input
                        type="number"
                        required
                        step="any"
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-mono text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                        Demand (1-10): {newItemDemand} / 10
                      </label>
                      <select
                        value={newItemDemand}
                        onChange={(e) => setNewItemDemand(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                          <option key={d} value={d}>{d} / 10</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase">
                        Tradeability Status
                      </label>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {newItemTradeable ? 'Item is tradeable between players' : 'Item is untradeable (displays orange highlight tag)'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newItemTradeable}
                        onChange={(e) => setNewItemTradeable(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Notes / Description</label>
                    <textarea
                      rows={2}
                      placeholder="Trading insights, combat meta notes..."
                      value={newItemNotes}
                      onChange={(e) => setNewItemNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-sans text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* CONSULTANT COMMENTATOR RATIONALE */}
                  {isConsultant && (
                    <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>Commentator Rationale (Google Docs Style)</span>
                        </label>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Required</span>
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={newItemCommentary}
                        onChange={(e) => setNewItemCommentary(e.target.value)}
                        placeholder="Provide details on where this unit is obtained, trading context, or justification for adding it..."
                        className="w-full px-3.5 py-2 bg-white dark:bg-[#0d1714] border border-emerald-300 dark:border-emerald-700 rounded-xl text-neutral-900 dark:text-white text-xs font-sans focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('items_manager')}
                      className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    {isConsultant ? (
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Item Proposal for Review</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 cursor-pointer"
                      >
                        Add Item
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* TAB: REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-3">
                  {filteredReports.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                      No player feedback reports pending.
                    </div>
                  ) : (
                    filteredReports.map((report, repIdx) => (
                      <div key={report.id || `report-${repIdx}`} className="p-4 rounded-2xl bg-white dark:bg-[#181c2b] border border-orange-100 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={report.itemThumbnail} alt={report.itemName} className="w-12 h-12 rounded-xl object-cover border border-orange-100 dark:border-neutral-700" />
                          <div>
                            <div className="font-['Chakra_Petch'] font-bold text-neutral-900 dark:text-white text-sm">
                              {report.itemName}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              Proposed: <strong className="text-orange-600 dark:text-orange-400 font-mono">{formatMilitaryValue(report.suggestedValue)}</strong> (Demand: {report.suggestedDemand}/10)
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              By @{report.playerUsername}
                            </div>
                          </div>
                        </div>

                        {report.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => acceptReport(report.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleStartEditReport(report)}
                              className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer"
                            >
                              Edit & Accept
                            </button>
                            <button
                              onClick={() => declineReport(report.id, 'Declined by staff')}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB: AUDIT LOGS */}
              {activeTab === 'audit_logs' && (
                <div className="space-y-4">
                  {/* Discord Webhook Real-time Status & Live Testing Bar */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-orange-500/30 text-white space-y-3.5 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                          <Radio className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-['Chakra_Petch'] text-sm font-bold uppercase tracking-wider text-orange-400">
                              Discord Webhook Engine
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Real-Time (Zero Queue Delay)
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Public changelogs stream instantly on save (~100ms–300ms HTTP latency).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={Boolean(testingWebhook)}
                          onClick={() => handleTestWebhook('changelog')}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shadow-sm shadow-orange-500/30 transition-all active:scale-95"
                        >
                          <Send className="w-3 h-3" />
                          <span>{testingWebhook === 'changelog' ? 'Testing...' : 'Test Changelog'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(testingWebhook)}
                          onClick={() => handleTestWebhook('reports')}
                          className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Send className="w-3 h-3" />
                          <span>{testingWebhook === 'reports' ? 'Testing...' : 'Test Reports'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Feedback Alert for Webhook Test */}
                    {webhookTestFeedback && (
                      <div className={`p-3 rounded-xl text-xs font-mono border flex items-start gap-2.5 transition-all ${
                        webhookTestFeedback.type === 'success'
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                          : (webhookTestFeedback.type === 'info'
                            ? 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                            : 'bg-rose-950/50 border-rose-500/40 text-rose-200')
                      }`}>
                        {webhookTestFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-bold flex items-center gap-2">
                            <span>{webhookTestFeedback.message}</span>
                            {webhookTestFeedback.latency !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                                {webhookTestFeedback.latency}ms latency
                              </span>
                            )}
                          </div>
                          {webhookTestFeedback.type === 'info' && (
                            <div className="text-[10px] opacity-80 mt-1">
                              Configure <code className="text-orange-300">DISCORD_CHANGELOG_WEBHOOK_URL</code> or <code className="text-orange-300">DISCORD_WEBHOOK_URL</code> in environment settings to route events directly to your Discord server channel.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Public Fields Checklist */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-neutral-300 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Price & Valuation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Demand & Trend</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Description & Notes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Picture & Name Changes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>New Item Listings</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Staff Attribution</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Category & Rarity</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300">100% Public Data</span>
                      </div>
                    </div>
                  </div>

                  {/* Search, Filter & Quick Statistics */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#161b22] p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    {/* Search bar */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search audit logs by item name, staff member, or note..."
                        className="w-full pl-9 pr-8 py-2 bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-orange-500 font-mono"
                      />
                      {auditSearch && (
                        <button
                          type="button"
                          onClick={() => setAuditSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Action Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-[11px] font-mono">
                      {[
                        { id: 'ALL', label: 'All Logs', count: auditLogs.length },
                        { id: 'MANUAL_EDIT', label: 'Edits', count: auditLogs.filter(l => l.action === 'MANUAL_EDIT').length },
                        { id: 'ITEM_ADDED', label: 'Adds', count: auditLogs.filter(l => l.action === 'ITEM_ADDED').length },
                        { id: 'ITEM_DELETED', label: 'Deletions', count: auditLogs.filter(l => l.action === 'ITEM_DELETED').length },
                        { id: 'REPORT_ACCEPTED', label: 'Approved', count: auditLogs.filter(l => l.action === 'REPORT_ACCEPTED').length },
                        { id: 'REPORT_DECLINED', label: 'Declined', count: auditLogs.filter(l => l.action === 'REPORT_DECLINED').length },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAuditActionFilter(tab.id as any)}
                          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all flex items-center gap-1.5 ${
                            auditActionFilter === tab.id
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'bg-neutral-100 dark:bg-[#21262d] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            auditActionFilter === tab.id
                              ? 'bg-white/20 text-white'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audit Logs List */}
                  <div className="space-y-2.5">
                    {(() => {
                      const filteredLogs = auditLogs.filter(log => {
                        if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
                        if (!auditSearch.trim()) return true;
                        const q = auditSearch.toLowerCase();
                        return (
                          log.itemName.toLowerCase().includes(q) ||
                          log.details.toLowerCase().includes(q) ||
                          log.moderator.toLowerCase().includes(q) ||
                          (log.category && log.category.toLowerCase().includes(q)) ||
                          (log.changes && log.changes.some(c => c.field.toLowerCase().includes(q) || (c.from !== undefined && String(c.from).toLowerCase().includes(q)) || (c.to !== undefined && String(c.to).toLowerCase().includes(q))))
                        );
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <div className="py-12 text-center text-neutral-500 dark:text-neutral-400 font-mono text-xs bg-white dark:bg-[#161b22] rounded-2xl border border-neutral-200 dark:border-neutral-800">
                            No audit history matching your filters. Edits made by staff will automatically log here and sync to Discord.
                          </div>
                        );
                      }

                      return filteredLogs.map((log, logIdx) => {
                        const isAdd = log.action === 'ITEM_ADDED';
                        const isDelete = log.action === 'ITEM_DELETED';
                        const isReport = log.action === 'REPORT_ACCEPTED';
                        const isDecline = log.action === 'REPORT_DECLINED';
                        const isExpanded = Boolean(expandedAuditLogIds[log.id]);
                        const hasChanges = log.changes && log.changes.length > 0;

                        return (
                          <div
                            key={log.id || `audit-log-${logIdx}`}
                            className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-neutral-800 text-xs hover:border-orange-300 dark:hover:border-neutral-700 transition-all shadow-sm space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                {log.thumbnail && (
                                  <img
                                    src={log.thumbnail}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="w-11 h-11 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 mt-0.5"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                )}
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${
                                      isAdd
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : (isDelete
                                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                          : (isReport
                                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                            : (isDecline
                                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                                              : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800')))
                                    }`}>
                                      {log.action}
                                    </span>
                                    <span className="font-bold text-neutral-900 dark:text-white font-['Chakra_Petch'] text-sm">
                                      {log.itemName}
                                    </span>
                                    {log.category && (
                                      <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                                        • {log.category}
                                      </span>
                                    )}
                                    {log.rarity && (
                                      <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                                        • {log.rarity}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[12px] text-neutral-700 dark:text-neutral-300 font-mono">
                                    {log.details}
                                  </p>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100 dark:border-neutral-800 gap-1">
                                <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-orange-400" />
                                  <span>{log.moderator}</span>
                                </div>
                                <div className="text-[10px] text-neutral-400">
                                  {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </div>
                            </div>

                            {/* Detailed Changes Breakdown */}
                            {hasChanges && (
                              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                                <div className="flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedAuditLogIds(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-orange-600 dark:text-orange-400 hover:underline"
                                  >
                                    <ListFilter className="w-3 h-3" />
                                    <span>{isExpanded ? 'Hide specific changes' : `View ${log.changes!.length} specific change details`}</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                  <span className="text-[10px] font-mono text-neutral-400">
                                    Audit ID: {log.id}
                                  </span>
                                </div>

                                {isExpanded && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-neutral-800">
                                    {log.changes!.map((change, chIdx) => (
                                      <div key={`change-${change.field}-${chIdx}`} className="p-2 rounded-lg bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-neutral-800 text-[11px] font-mono space-y-1">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                          {change.field}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {change.from !== undefined && (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 line-through text-[10px]">
                                              {change.from}
                                            </span>
                                          )}
                                          {change.from !== undefined && change.to !== undefined && (
                                            <span className="text-neutral-400 text-[10px]">➔</span>
                                          )}
                                          {change.to !== undefined && (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                              {change.to}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* TAB: ADMINS ONLY - STAFF ROSTER & ROLE CONTROLS */}
              {activeTab === 'admin_staff' && isAdmin && (
                <div className="space-y-6">
                  {/* Banner & Stats */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/80 dark:border-amber-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                          Staff Roster & Credentials Management
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl">
                        Admins can create staff accounts, assign roles (Admin / Analyst / Staff), reset passwords, and revoke access instantly. No external OAuth dependencies required.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#181c2b] border border-amber-200/80 dark:border-amber-900/40 text-center">
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">{staffMembers.length}</div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">Total Roster</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#181c2b] border border-amber-200/80 dark:border-amber-900/40 text-center">
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {staffMembers.filter(s => s.role === 'Admin').length}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">Admins</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#181c2b] border border-cyan-200/80 dark:border-cyan-900/40 text-center">
                        <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                          {staffMembers.filter(s => s.role === 'Analyst').length}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">Analysts</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#181c2b] border border-blue-200/80 dark:border-blue-900/40 text-center">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                          {staffMembers.filter(s => s.role === 'Staff' || (s.role as any) === 'Moderator').length}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">Staff</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#181c2b] border border-emerald-200/80 dark:border-emerald-900/40 text-center">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {staffMembers.filter(s => s.role === 'Consultant').length}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">Consultants</div>
                      </div>
                    </div>
                  </div>

                  {/* Add New Staff Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-orange-500" />
                        <h5 className="font-['Chakra_Petch'] text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                          Create New Staff Account
                        </h5>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono">One-time temporary password</span>
                    </div>

                    <form onSubmit={handleAddStaffSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1 font-mono">
                            Staff Username <span className="text-orange-500">*</span>
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                            <input
                              type="text"
                              required
                              placeholder="staffname"
                              value={newStaffUsername}
                              onChange={(e) => setNewStaffUsername(e.target.value)}
                              className="w-full pl-9 pr-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-orange-500 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1 font-mono">
                            Preserve Existing Role
                          </label>
                          <select
                            value={newStaffLegacyId}
                            onChange={(e) => {
                              const legacy = staffMembers.find(member => member.id === e.target.value);
                              setNewStaffLegacyId(e.target.value);
                              if (legacy) setNewStaffRole(legacy.role);
                            }}
                            className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
                          >
                            <option value="">New staff account</option>
                            {staffMembers.filter(member => !member.linked).map(member => (
                              <option key={member.id} value={member.id}>
                                {member.displayName || member.username} — {member.role}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1 font-mono">
                            Display Name / Alias
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Alex M."
                            value={newStaffDisplayName}
                            onChange={(e) => setNewStaffDisplayName(e.target.value)}
                            className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1 font-mono">
                            {newStaffLegacyId ? 'Preserved Role' : 'Assigned Role'}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setNewStaffRole('Consultant')}
                              disabled={Boolean(newStaffLegacyId)}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                newStaffRole === 'Consultant'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : 'bg-neutral-50 dark:bg-[#0f111a] border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-300'
                              }`}
                              title="Subordinate to Staff: Google Docs Commentator suggesting mode with Admin approval queue"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Consultant</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNewStaffRole('Staff')}
                              disabled={Boolean(newStaffLegacyId)}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                newStaffRole === 'Staff' || (newStaffRole as any) === 'Moderator'
                                  ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                  : 'bg-neutral-50 dark:bg-[#0f111a] border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-blue-300'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Staff</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNewStaffRole('Analyst')}
                              disabled={Boolean(newStaffLegacyId)}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                newStaffRole === 'Analyst'
                                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                                  : 'bg-neutral-50 dark:bg-[#0f111a] border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-cyan-300'
                              }`}
                            >
                              <BarChart3 className="w-3 h-3" />
                              <span>Analyst</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNewStaffRole('Admin')}
                              disabled={Boolean(newStaffLegacyId)}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                newStaffRole === 'Admin'
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-sm'
                                  : 'bg-neutral-50 dark:bg-[#0f111a] border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-amber-300'
                              }`}
                            >
                              <Crown className="w-3 h-3" />
                              <span>Admin</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {staffFeedback && (
                        <div className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                          staffFeedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                        }`}>
                          {staffFeedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                          <span>{staffFeedback.message}</span>
                        </div>
                      )}

                      {oneTimePassword && (
                        <div className="rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-950 dark:text-amber-100">
                          <div className="font-bold">Temporary password — shown only once</div>
                          <code className="block break-all select-all mt-1">{oneTimePassword}</code>
                          <button type="button" onClick={() => setOneTimePassword('')} className="mt-2 underline">I saved it</button>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-2 transition-all active:scale-[0.98]"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Create Account</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Current Staff List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h5 className="font-['Chakra_Petch'] text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-500" />
                        <span>Active Staff Roster ({staffMembers.length})</span>
                      </h5>
                      <span className="text-xs text-neutral-400">Usernames and role access</span>
                    </div>

                    <div className="space-y-2.5">
                      {staffMembers.map((member, memIdx) => {
                        const isCurrentUser = activeStaff?.id === member.id;
                        const adminCount = staffMembers.filter(s => s.linked && s.role === 'Admin').length;
                        const isSoleAdmin = Boolean(member.linked) && member.role === 'Admin' && adminCount <= 1;

                        return (
                          <div
                            key={member.id || `staff-${member.username}-${memIdx}`}
                            className="p-4 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-orange-300 dark:hover:border-neutral-700"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                                member.role === 'Admin'
                                  ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-sm shadow-amber-500/30'
                                  : member.role === 'Analyst'
                                  ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-sm shadow-cyan-500/30'
                                  : 'bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-sm shadow-blue-500/30'
                              }`}>
                                {member.role === 'Admin' ? (
                                  <Crown className="w-5 h-5" />
                                ) : member.role === 'Analyst' ? (
                                  <BarChart3 className="w-5 h-5" />
                                ) : (
                                  <ShieldCheck className="w-5 h-5" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                                    {member.displayName || member.username}
                                  </span>

                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1 ${
                                    member.role === 'Admin'
                                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                                      : member.role === 'Analyst'
                                      ? 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300'
                                      : member.role === 'Consultant'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                                  }`}>
                                    {member.role === 'Admin' ? (
                                      <Crown className="w-2.5 h-2.5 text-amber-500" />
                                    ) : member.role === 'Analyst' ? (
                                      <BarChart3 className="w-2.5 h-2.5 text-cyan-500" />
                                    ) : member.role === 'Consultant' ? (
                                      <MessageSquare className="w-2.5 h-2.5 text-emerald-500" />
                                    ) : (
                                      <ShieldCheck className="w-2.5 h-2.5 text-blue-500" />
                                    )}
                                    {member.role === 'Moderator' ? 'Staff' : member.role}
                                  </span>

                                  {isCurrentUser && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold font-mono">
                                      YOU
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate mt-0.5">
                                  <span>Username: <strong className="text-neutral-700 dark:text-neutral-300">{member.linked ? member.username : 'Not linked — select this profile above to set up sign-in'}</strong></span>
                                </div>

                                <div className="text-[10px] text-neutral-400 mt-0.5">
                                  Created {new Date(member.addedAt).toLocaleDateString()} {member.addedBy ? `by ${member.addedBy}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordChangeMember(member);
                                  setPasswordChangeFeedback(null);
                                }}
                                disabled={!member.linked || isCurrentUser}
                                className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-500" />
                                <span>Reset Password</span>
                              </button>

                              {!isSoleAdmin && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={member.role === 'Moderator' ? 'Staff' : member.role}
                                    onChange={async (e) => {
                                      const newRole = e.target.value as StaffRole;
                                      const result = await updateStaffRole(member.id, newRole);
                                      setStaffFeedback({ type: result.success ? 'success' : 'error', message: result.message });
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus:border-orange-500"
                                    title="Assign role"
                                  >
                                    <option value="Consultant">Role: Consultant (Commentator)</option>
                                    <option value="Staff">Role: Staff</option>
                                    <option value="Moderator">Role: Moderator</option>
                                    <option value="Analyst">Role: Analyst</option>
                                    <option value="Admin">Role: Admin</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => setStaffMemberToRemove(member)}
                                    className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                    title="Revoke staff access"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                </div>
                              )}

                              {isSoleAdmin && (
                                <span className="text-[11px] text-neutral-400 italic px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                  Primary Admin
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BULK IMAGE UPLOADER (ADMIN ONLY) */}
              {activeTab === 'bulk_images' && (
                isAdmin ? (
                  <div className="max-w-5xl mx-auto">
                    <BatchImageUploader />
                  </div>
                ) : (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                      <Crown className="w-6 h-6" />
                    </div>
                    <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-950 dark:text-white uppercase">
                      Admin Access Required
                    </h4>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Bulk image uploading is restricted to administrators. Please switch to an Administrator account to upload assets.
                    </p>
                  </div>
                )
              )}

              {/* TAB: AUTOMATION TOOLS (ADMIN ONLY) */}
              {activeTab === 'automations' && (
                isAdmin ? (
                  <AdminAutomationTools />
                ) : (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-950 dark:text-white uppercase">
                      Admin Access Required
                    </h4>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Automation tools are restricted to administrators. Please authenticate with an Administrator account to access bulk operations.
                    </p>
                  </div>
                )
              )}

              {/* TAB: DATA EXPORT (ANALYST & ADMIN) */}
              {activeTab === 'export_data' && (
                canExport ? (
                  <DataExportView />
                ) : (
                  <div className="p-12 text-center space-y-3 bg-white dark:bg-[#161b22] rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto border border-cyan-500/20">
                      <Download className="w-6 h-6" />
                    </div>
                    <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-950 dark:text-white uppercase">
                      Analyst or Admin Access Required
                    </h4>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Data export is restricted to Analyst and Administrator accounts. Please contact an administrator if you need analyst export permissions.
                    </p>
                  </div>
                )
              )}
              {/* TAB: SITE BACKUPS & DISASTER RECOVERY */}
              {activeTab === 'backups' && (
                <SiteBackupsManager />
              )}

              {/* TAB: CONSULTANT PROPOSALS & REVIEW PANEL */}
              {activeTab === 'consultant_proposals' && (
                <ErrorBoundary
                  fallbackTitle="Consultant Proposals Review"
                  fallbackDescription="Unable to render the proposals view. Please click Try Again or switch tabs."
                >
                  <ConsultantReviewPanel />
                </ErrorBoundary>
              )}
            </div>
          </>
        )}
      </div>

      {showOwnPasswordChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form onSubmit={handleOwnPasswordChange} className="w-full max-w-sm bg-white dark:bg-[#181c2b] rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="font-bold text-neutral-900 dark:text-white">Change Your Password</h4>
            <input type="password" autoComplete="current-password" required placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-3 rounded-xl border dark:bg-neutral-900 dark:text-white" />
            <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} placeholder="New password (at least 12 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 rounded-xl border dark:bg-neutral-900 dark:text-white" />
            {ownPasswordFeedback && <p className="text-sm text-rose-600">{ownPasswordFeedback}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowOwnPasswordChange(false)} className="flex-1 rounded-xl border p-2 dark:text-white">Cancel</button>
              <button type="submit" className="flex-1 rounded-xl bg-orange-500 p-2 text-white">Change Password</button>
            </div>
          </form>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordChangeMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white dark:bg-[#181c2b] border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white">
                Reset Staff Password
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Generate a new temporary password for <strong className="text-neutral-900 dark:text-white font-mono">{passwordChangeMember.username}</strong>.
              </p>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-3">
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900 p-3 text-xs text-neutral-600 dark:text-neutral-300">
                Their current sessions will be signed out. Share the new password privately and ask them to change it after signing in.
              </div>

              {passwordChangeFeedback && (
                <div className={`p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                  passwordChangeFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}>
                  {passwordChangeFeedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{passwordChangeFeedback.message}</span>
                </div>
              )}
              {resetTemporaryPassword && (
                <div className="rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-950 dark:text-amber-100">
                  <div className="font-bold">New temporary password — shown only once</div>
                  <code className="block break-all select-all mt-1">{resetTemporaryPassword}</code>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setPasswordChangeMember(null); setResetTemporaryPassword(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-orange-500/20"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF REMOVE CONFIRMATION MODAL */}
      {staffMemberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white dark:bg-[#181c2b] border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white">
                Revoke Staff Access?
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Are you sure you want to remove <strong className="text-neutral-900 dark:text-white font-mono">{staffMemberToRemove.username}</strong> ({staffMemberToRemove.displayName || staffMemberToRemove.role}) from the staff roster? They will immediately lose moderation and editor privileges.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStaffMemberToRemove(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  removeStaffMember(staffMemberToRemove.id);
                  setStaffMemberToRemove(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EDIT SUB-MODAL */}
      {selectedEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#181c2b] border border-orange-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white">
                  Quick Edit: {itemEditForm.name || selectedEditItem.name}
                </h4>
                {isConsultant && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Suggesting
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedEditItem(null)}
                className="text-neutral-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isConsultant && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 shrink-0">
                <div className="p-1 rounded-lg bg-emerald-500 text-white shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] text-emerald-900 dark:text-emerald-300 leading-snug">
                  <span className="font-bold block uppercase tracking-wide">Commentator Suggestion Mode</span>
                  Any changes you save here will be submitted as a detailed suggestion to the Admin Review Panel for one-click approval.
                </div>
              </div>
            )}

            <form onSubmit={handleSaveItemEdit} className="space-y-3 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemEditForm.name}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white focus:outline-none"
                    placeholder="Item name"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300">Acronym</label>
                  <input
                    type="text"
                    value={itemEditForm.acronym}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, acronym: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white focus:outline-none uppercase"
                    placeholder="e.g. F22"
                  />
                </div>
              </div>

              {/* Category and Rarity */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300">Category</label>
                  <select
                    value={itemEditForm.category}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, category: e.target.value as ItemCategory })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300">Rarity</label>
                  <select
                    value={itemEditForm.rarity}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, rarity: e.target.value as ItemRarity })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
                  >
                    {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Picture / Thumbnail with Clipboard Paste */}
              <div className="p-3 bg-orange-50/70 dark:bg-neutral-800/60 border border-orange-100 dark:border-neutral-700 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold block text-neutral-800 dark:text-neutral-200">Item Picture</label>
                  <button
                    type="button"
                    onClick={handleQuickEditPasteClipboard}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold shadow-sm cursor-pointer"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Paste Clipboard</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 border border-orange-200 dark:border-neutral-700 shrink-0 shadow-sm">
                    <img
                      src={itemEditForm.thumbnail || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80'}
                      alt="Thumbnail preview"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={itemEditForm.thumbnail}
                      onChange={(e) => setItemEditForm({ ...itemEditForm, thumbnail: e.target.value })}
                      placeholder="Image URL or data URI"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-[11px] text-neutral-900 dark:text-white focus:outline-none"
                    />
                    <input
                      type="file"
                      ref={quickEditFileInputRef}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const optimized = await optimizeImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.85 });
                            setItemEditForm(prev => ({ ...prev, thumbnail: optimized }));
                            setQuickEditClipboardStatus('Optimized image loaded!');
                            setTimeout(() => setQuickEditClipboardStatus(''), 2500);
                          } catch (err) {
                            console.error('Failed to optimize image:', err);
                          }
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => quickEditFileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-600 dark:text-neutral-300 font-medium cursor-pointer"
                    >
                      <Upload className="w-2.5 h-2.5 text-neutral-400" />
                      <span>Upload File</span>
                    </button>
                  </div>
                </div>

                {quickEditClipboardStatus && (
                  <div className="text-[10px] text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 rounded">
                    {quickEditClipboardStatus}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold block text-neutral-700 dark:text-neutral-300 text-xs">
                    Base Market Value (Gems 💎)
                  </label>
                  <span className="text-[11px] text-orange-600 dark:text-orange-400 font-bold font-mono">
                    {formatMilitaryValue(parseMilitaryValueInput(itemEditForm.value))} ({parseMilitaryValueInput(itemEditForm.value).toLocaleString()} 💎)
                  </span>
                </div>
                <input
                  type="text"
                  value={itemEditForm.value}
                  placeholder="e.g. 100M, 100 mil, or 100000000"
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = parseMilitaryValueInput(raw);
                    setItemEditForm(prev => ({
                      ...prev,
                      value: raw,
                      starOverrides: prev.hasCustomStarOverrides ? {
                        ...prev.starOverrides,
                        '0': parsed,
                        fresh: parsed
                      } : prev.starOverrides
                    }));
                  }}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-orange-500"
                />

                {/* Quick Presets & Adders */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase mr-1">Presets:</span>
                  {[1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000, 500_000_000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setItemEditForm(prev => ({
                        ...prev,
                        value: val,
                        starOverrides: prev.hasCustomStarOverrides ? { ...prev.starOverrides, '0': val, fresh: val } : prev.starOverrides
                      }))}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-500 hover:text-white text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                    >
                      {formatMilitaryValue(val)}
                    </button>
                  ))}
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase mx-1">Add:</span>
                  {[1_000_000, 10_000_000, 100_000_000].map(delta => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => {
                        const current = parseMilitaryValueInput(itemEditForm.value);
                        const next = Math.max(0, current + delta);
                        setItemEditForm(prev => ({
                          ...prev,
                          value: next,
                          starOverrides: prev.hasCustomStarOverrides ? { ...prev.starOverrides, '0': next, fresh: next } : prev.starOverrides
                        }));
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-100 dark:bg-orange-950/60 hover:bg-orange-500 hover:text-white text-orange-700 dark:text-orange-300 transition-colors cursor-pointer"
                    >
                      +{formatMilitaryValue(delta)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Star Pricing Configuration (Air, Sea, Land) */}
              {isVehicleCategory(itemEditForm.category) && (
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-700/60 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-neutral-900 dark:text-white text-[11px]">
                        Vehicle Star Pricing (Air/Sea/Land)
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemEditForm.hasCustomStarOverrides}
                        onChange={(e) => setItemEditForm({ ...itemEditForm, hasCustomStarOverrides: e.target.checked })}
                        className="rounded text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                        Custom Star Override
                      </span>
                    </label>
                  </div>

                  {itemEditForm.hasCustomStarOverrides ? (
                    <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                      <p className="text-[10px] text-amber-800 dark:text-amber-300">
                        Specify exact final values for each star rank for this item:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                        {STAR_TIERS.map((tier, tIdx) => (
                          <div key={tier.id || `star-override-${tIdx}`} className="p-1.5 rounded-lg bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                                {tier.label}
                              </span>
                              <span className="text-[9px] font-mono text-orange-500 font-bold">
                                {tier.shortLabel}
                              </span>
                            </div>
                            <input
                              type="number"
                              step="any"
                              value={itemEditForm.starOverrides[tier.id] ?? (parseMilitaryValueInput(itemEditForm.value) + (universalStarConfig[tier.id] || 0))}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItemEditForm(prev => ({
                                  ...prev,
                                  starOverrides: {
                                    ...prev.starOverrides,
                                    [tier.id]: val
                                  }
                                }));
                              }}
                              className="w-full px-1.5 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-[11px] font-mono font-bold text-neutral-900 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      Using Universal Star Config: 5★ = {formatMilitaryValue(parseMilitaryValueInput(itemEditForm.value) + (universalStarConfig['5'] || 60000))}
                    </div>
                  )}
                </div>
              )}

              {/* Soldier & Drone Multiplier Configuration (0*, 1*, 2*, 3*) */}
              {isSoldierOrDroneCategory(itemEditForm.category) && (
                <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-700/60 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-bold text-neutral-900 dark:text-white text-[11px]">
                        Soldier / Drone Multipliers (0★ to 3★)
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemEditForm.hasCustomMultiplierOverrides}
                        onChange={(e) => setItemEditForm({ ...itemEditForm, hasCustomMultiplierOverrides: e.target.checked })}
                        className="rounded text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                        Custom Multipliers Override
                      </span>
                    </label>
                  </div>

                  {itemEditForm.hasCustomMultiplierOverrides ? (
                    <div className="space-y-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                      <p className="text-[10px] text-emerald-800 dark:text-emerald-300">
                        Specify multiplier factor for each star tier for this {itemEditForm.category.toLowerCase()}:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SOLDIER_DRONE_STAR_TIERS.map((tier, tIdx) => {
                          const mult = itemEditForm.multiplierOverrides[tier.id] ?? (universalSoldierDroneStarConfig[tier.id] ?? 1);
                          const finalVal = parseMilitaryValueInput(itemEditForm.value) * mult;
                          return (
                            <div key={tier.id || `multiplier-override-${tIdx}`} className="p-2 rounded-xl bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                                  {tier.label}
                                </span>
                                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                  Tier {tier.id}★
                                </span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  value={mult}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setItemEditForm(prev => ({
                                      ...prev,
                                      multiplierOverrides: {
                                        ...prev.multiplierOverrides,
                                        [tier.id]: val
                                      }
                                    }));
                                  }}
                                  className="w-full pl-2 pr-5 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono font-bold text-neutral-900 dark:text-white"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ×
                                </span>
                              </div>
                              <div className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                                = {formatMilitaryValue(finalVal)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      Using Universal Multipliers: 0★ (1x), 1★ ({universalSoldierDroneStarConfig['1']}x), 2★ ({universalSoldierDroneStarConfig['2']}x), 3★ ({universalSoldierDroneStarConfig['3']}x) → 3★ = {formatMilitaryValue(parseMilitaryValueInput(itemEditForm.value) * (universalSoldierDroneStarConfig['3'] || 50))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300">Demand (1-10)</label>
                  <select
                    value={itemEditForm.demand}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, demand: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300">Trend</label>
                  <select
                    value={itemEditForm.trend}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, trend: e.target.value as PriceTrend })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
                  >
                    {TRENDS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Tradeable Status Toggle */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-700 rounded-2xl flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase">
                    Tradeable Item
                  </label>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {itemEditForm.tradeable ? 'Players can trade this item' : 'Untradeable (highlighted in orange)'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemEditForm.tradeable}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, tradeable: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {/* Description / Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">
                    Description / Notes
                  </label>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                    {(itemEditForm.notes || '').length} chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={itemEditForm.notes || ''}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, notes: e.target.value })}
                  placeholder="Trading insights, combat meta notes, background lore..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-xs font-sans focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* CONSULTANT COMMENTATOR RATIONALE */}
              {isConsultant && (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Commentator Rationale (Google Docs Style)</span>
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Required</span>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={quickEditCommentary}
                    onChange={(e) => setQuickEditCommentary(e.target.value)}
                    placeholder="Provide detailed trade data, marketplace observations, or reasons for this proposed change..."
                    className="w-full px-3 py-2 bg-white dark:bg-[#0d1714] border border-emerald-300 dark:border-emerald-700 rounded-xl text-neutral-900 dark:text-white text-xs font-sans focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 shrink-0">
                {!isConsultant ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEditItem) {
                        setItemToDelete(selectedEditItem);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 font-bold text-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Item</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-neutral-400 italic">
                    Deletion disabled for Consultants
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEditItem(null)}
                    className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  {isConsultant ? (
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold cursor-pointer text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Suggestion</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold cursor-pointer text-xs shadow-md shadow-orange-500/20"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE IN-APP CONFIRMATION MODAL FOR DELETION */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#141722] border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase">
                  Confirm Item Removal
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Permanent Catalog Deletion
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
              <img
                src={itemToDelete.thumbnail}
                alt={itemToDelete.name}
                className="w-12 h-12 rounded-xl object-contain p-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-neutral-900 dark:text-white truncate">
                  {itemToDelete.name}
                </div>
                <div className="text-xs font-mono text-orange-600 dark:text-orange-400 font-bold">
                  {formatMilitaryValue(itemToDelete.value)}
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {itemToDelete.category} • {itemToDelete.rarity}
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-neutral-900 dark:text-white font-mono">{itemToDelete.name}</strong> from the active Military Tycoon Value list? This will remove its pricing history and listings.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteItem(itemToDelete.id);
                  if (selectedEditItem?.id === itemToDelete.id) {
                    setSelectedEditItem(null);
                  }
                  setItemToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
