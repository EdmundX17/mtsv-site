import React, { useState, useRef, useMemo } from 'react';
import { useValueList } from '../context/ValueListContext';
import { MilitaryItem } from '../types';
import { 
  Upload, CheckCircle2, AlertTriangle, Image as ImageIcon, Sparkles, 
  RefreshCw, X, FileCheck, Layers, Search, Filter, Edit3, Trash2,
  ShieldAlert, Check, HelpCircle, ArrowRight, UserCheck, Bot
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { optimizeImage } from '../utils/imageOptimizer';
import { staffApiFetch } from '../lib/staffApi';

export interface FileMatchPreview {
  id: string; // unique ID for React list keys
  file: File;
  name: string;
  dataUrl: string;
  matchedItem?: MilitaryItem;
  matchType: 'exact' | 'normalized' | 'alias' | 'fuzzy' | 'manual' | 'unmatched';
  confidence: number; // 0 to 100
  status: 'matched' | 'unmatched';
}

const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Removes noisy file qualifiers (e.g. `(1)`, `_1`, `copy`, `3 star`, `drone`, `soldier`, `icon`, `render`, `card`, etc.)
 */
function cleanFileName(fileName: string): string {
  let base = fileName.replace(/\.[^/.]+$/, '').trim();

  // Remove common bracketed / parenthetical notes like (1), (2), (Copy), (3 Star), [3 Star], (LE), [Soldier], etc.
  base = base.replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, ' ');

  // Remove star mentions like "3 Star", "- 3 Star", "3-Star", "3star", "0 Star", "3 Stars", "3*"
  base = base.replace(/[-_\s]*\b(?:0|1|2|3|4|5)[-\s]*(?:star|stars|\*)\b/gi, ' ');

  // Remove trailing numbering like _1, -1, _2, -2, " 1", " 2"
  base = base.replace(/[_-\s]+\d+$/, '');

  // Remove common redundant asset descriptors if not part of core name
  base = base.replace(/\b(?:icon|thumbnail|thumb|render|card|avatar|pic|photo|transparent|crop|preview|highres|hd)\b/gi, ' ');

  // Clean trailing and consecutive separators
  base = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  return base;
}

/**
 * Comprehensive Dictionary of Aliases for Vehicles, Soldiers, Drones & Specials
 */
const ALIASES: Record<string, string> = {
  // === SOLDIERS ===
  "super ace pilot": "Super Ace Pilot",
  "super ace": "Super Ace Pilot",
  "superace": "Super Ace Pilot",
  "super ace pilot soldier": "Super Ace Pilot",
  "super ace pilot troop": "Super Ace Pilot",
  "super ace troop": "Super Ace Pilot",
  "superacepilot": "Super Ace Pilot",
  "super-ace-pilot": "Super Ace Pilot",
  "super_ace_pilot": "Super Ace Pilot",
  "ace pilot": "Ace Pilot",
  "ace pilot soldier": "Ace Pilot",
  "ace pilot troop": "Ace Pilot",
  "acepilot": "Ace Pilot",
  "ace-pilot": "Ace Pilot",
  "ace_pilot": "Ace Pilot",
  "air commander": "Air Commander",
  "air commander soldier": "Air Commander",
  "aircommander": "Air Commander",
  "super alien": "Super Alien",
  "super alien soldier": "Super Alien",
  "superalien": "Super Alien",
  "alien": "Alien",
  "alien soldier": "Alien",
  "the ice zombie slayer": "TheIceZombieSlayer",
  "theicezombieslayer": "TheIceZombieSlayer",
  "ice zombie slayer": "TheIceZombieSlayer",
  "icezombieslayer": "TheIceZombieSlayer",
  "enraged vampire": "Enrageed Vampire",
  "enrageed vampire": "Enrageed Vampire",
  "enraged werewolf": "Enraged Werewolf",
  "vampire": "Vampire",
  "werewolf": "Werewolf",
  "pumpkin soldier": "Pumpkin Soldier",
  "super pumpkin": "Super Pumpkin",
  "puckmonster": "Puckmonster",
  "puck monster": "Puckmonster",
  "jet engineer": "Jet Engineer",
  "jetpack fighter": "Jetpack Fighter",
  "nuke sniper": "Nuke Sniper Soldier",
  "nuke sniper soldier": "Nuke Sniper Soldier",
  "nukesniper": "Nuke Sniper Soldier",
  "tv juggernaut": "TV Juggernaut",
  "tvjuggernaut": "TV Juggernaut",
  "elite hacker": "Elite Hacker",
  "elitehacker": "Elite Hacker",
  "black hawk trooper": "Black Hawk Trooper",
  "blackhawk trooper": "Black Hawk Trooper",
  "boss killer": "Boss Killer",
  "boss reaper": "Boss Reaper",
  "commander x": "Commander X",
  "commander-x": "Commander X",
  "commanderx": "Commander X",
  "drill worker": "Drill Worker",
  "drillworker": "Drill Worker",
  "elite grenadier": "Elite Grenadier",
  "elite soldier": "Elite soldier",
  "golden soldier": "Golden Soldier",
  "gold soldier": "Golden Soldier",
  "grenadier": "Grenadier",
  "grumpy killer": "Grumpy Killer",
  "hacker": "Hacker",
  "heavy": "Heavy",
  "heavy zombie": "Heavy Zombie",
  "juggernaut": "Juggernaut",
  "marine": "Marine",
  "medic": "Medic",
  "naval officer": "Naval Officer",
  "private": "Private",
  "pyro": "Pyro",
  "raid soldier": "Raid Soldier",
  "railgun killer": "Railgun Killer",
  "ravage soldier": "Ravage Soldier",
  "rpg soldier": "RPG Soldier",
  "rpg zombie": "RPG Zombie",
  "santa assassin": "Santa Assassin",
  "santa killer": "Santa Killer",
  "santa medic": "Santa Medic",
  "santa private": "Santa Private",
  "shock trooper": "Shock Trooper",
  "sniper": "Sniper",
  "super sniper": "Super Sniper",
  "toxic trooper": "Toxic Trooper",
  "tv soldier": "TV Soldier",
  "vault raider": "Vault Raider",
  "zombie juggernaut": "Zombie Juggernaut",
  "assassin": "Assassin",
  "aa soldier": "AA Soldier",
  "aasoldier": "AA Soldier",
  "uzi": "UZI",
  "war bunny": "War Bunny",
  "slash bunny": "Slash Bunny",
  "grenade bunny": "Grenade Bunny",
  "warlord bunny": "Warlord Bunny",
  "noscope bunny": "Noscope Bunny",
  "egg launcher": "Egg Launcher",

  // === DRONES ===
  "super repair drone": "Super Repair Drone",
  "super repair": "Super Repair Drone",
  "super repair drone drone": "Super Repair Drone",
  "superrepairdrone": "Super Repair Drone",
  "superrepair": "Super Repair Drone",
  "super-repair-drone": "Super Repair Drone",
  "super_repair_drone": "Super Repair Drone",
  "repair drone": "Repair Drone",
  "repairdrone": "Repair Drone",
  "repair-drone": "Repair Drone",
  "repair_drone": "Repair Drone",
  "healing drone": "LE Healing Drone",
  "le healing drone": "LE Healing Drone",
  "le healingdrone": "LE Healing Drone",
  "le_healingdrone": "LE Healing Drone",
  "le-healing-drone": "LE Healing Drone",
  "healingdrone": "LE Healing Drone",
  "healing-drone": "LE Healing Drone",
  "healing_drone": "LE Healing Drone",
  "stalker drone": "Stalker Drone",
  "stalkerdrone": "Stalker Drone",
  "stalker-drone": "Stalker Drone",
  "stalker_drone": "Stalker Drone",
  "reaper drone": "Reaper Drone",
  "reaperdrone": "Reaper Drone",
  "reaper-drone": "Reaper Drone",
  "reaper_drone": "Reaper Drone",
  "missile drone": "Missile Drone",
  "missiledrone": "Missile Drone",
  "missile-drone": "Missile Drone",
  "missile_drone": "Missile Drone",
  "attack drone": "Attack Drone",
  "attackdrone": "Attack Drone",
  "attack-drone": "Attack Drone",
  "attack_drone": "Attack Drone",

  // === VEHICLES & NAVAL ===
  "warship": "Warship",
  "war ship": "Warship",
  "typhoon (sub)": "Typhoon (Sub)",
  "typhoon": "Typhoon (Sub)",
  "gold typhoon": "Gold Typhoon",
  "boss north carolina": "North Carolina",
  "le bismarck(g)": "LE BISMARCK (G)",
  "le bismarck": "LE BISMARCK",
  "lebismarck": "LE BISMARCK",
  "drone carrier": "Drone carrier",
  "super drone carrier": "Super Drone Carrier",
  "corsair x": "Corsair-X",
  "corsair-x": "Corsair-X",
  "railgun-x destroyer": "Railgun-X Destroyer",
  "railgun x destroyer": "Railgun-X Destroyer",
  "seabreacher-x": "SeaBreacher-X",
  "seabreacher x": "SeaBreacher-X",
  "submarinec": "Submarine (C)",
  "submarinerare": "Submarine (Rare)",
  "x59": "X-59",
  "super x59": "Super X59",
  "vespa tap": "Vespa Tap",
  "super vespa tap": "Super Vespa Tap",
  "tks20": "TKS-20",
  "gold tks20": "Gold TKS20",
  "armored snowmobile": "Armored Snow mobile",
  "super kieler": "Super Kieler",
  "keiler": "Keiler",
  "sukhoi su25": "Sukhoi SU25",
  "sukhoi su57": "Sukhoi SU57",
  "su57": "Sukhoi SU57",
  "su25": "Sukhoi SU25",
  "le cobra": "LE Cobra",
  "le cobra super": "LE Cobra Super",
  "f18": "LE F18 Hornet",
  "darkstar": "Darkstar-X",
  "darkstar mk2": "Rainbow Darkstar",
  "super darkstar mk-2": "Rainbow Darkstar",
  "super darkstar mk2": "Rainbow Darkstar",
  "zeplin-x": "Elite Zeplin-X",
  "zeplinx": "Elite Zeplin-X",
  "pl01": "PL-01 Liberty",
  "pl01 liberty": "PL-01 Liberty",
  "patriot truck": "Limited Patriot",
  "sam truck": "S.A.M. Truck",
  "s.a.m. truck": "S.A.M. Truck",
  "foch 155": "Foch 155",
  "liberty foch": "Liberty Foch",
  "m10 booker": "M10 Booker",
  "gold m10": "Gold M10",
  "abram tank": "Abram Tank",
  "green abram tank": "Abram Tank",
  "abram x": "M1E3",
  "super m1e3": "Super M1E3",
  "aa abram": "Abram Tank",
  "aatank": "AATank",
  "tank": "Battle Tank",
  "truck": "Hacker Truck",
  "turret truck": "Mortar Truck",
  "missile truck": "Nuke Mortar Truck",
  "laser truck": "Super Beam Tank",
  "super laser truck": "Super Beam Tank",
  "dune buggy": "BOSS Buggy",
  "boss buggy": "BOSS Buggy",
  "alvis stormer": "Alvis Stormer",
  "boss stormer": "BOSS Stormer",
  "sand hyena": "Hellstorm",
  "tiger tank": "Tiger Mech",
  "super tiger tank": "Super Tiger Mech",
  "leopard tank": "Keiler",
  "leopard 2a7": "Keiler",
  "t90 tank": "Heavy T28",
  "t90-m": "Heavy T28",
  "t90m": "Heavy T28",
  "rocket tank": "Super TOS1",
  "terrorbyte": "Hacker X",
  "edjer": "Driller",
  "minigun edjer": "Driller",
  "super edjer": "Driller",
  "s-tank barrage": "Tesla Tank",
  "s-tank gatling": "Super Tesla Tank",
  "stank barrage": "Tesla Tank",
  "stank gatling": "Super Tesla Tank",
  "rg-1 railgun car": "Beam Tank",
  "rg1 railgun car": "Beam Tank",
  "pyro tank": "Haunted Tank",
  "motorbike": "Super Hoverbike",
  "maus tank": "Imperial Tank",
  "santa maus": "Super Imperial Tank",
  "challenger": "Werewolf Tank",
  "super volk": "Super Speeder",
  "volk": "Super Speeder",
  "weiner wagon": "Love Buggy",
  "stomper": "Mech Walker",
  "the annihilator": "The Annihilator",
  "terminator": "Super Mech Walker",
  "tv tank": "Master Warmaul",
  "super striker": "Super Akrep",
  "striker": "Super Akrep",
  "phanter": "Chrysler",
  "super phanter": "Nuke Chrysler",
  "sturmtank": "Driller",
  "strela": "Skynex",
  "shocker": "Top5 MLRS",
  "railgun tank": "Super Beam Tank",
  "puma recon": "Top5 AN Jeep",
  "rt01": "Anti Nuke Jeep",
  "phl-03": "BOSS MLRS",
  "phl03": "BOSS MLRS",
  "pantsir": "Korkut",
  "medic truck": "Medic Helicopter",
  "merkava": "Master Overlord",
  "mzkt": "Top5 Overlord",
  "manti core": "Overlord",
  "manticore": "Overlord",
  "katyusha": "MLRS",
  "f16": "Platinum SB-12",
  "golden f16": "Plat Skyhammer",
  "platinum f16": "Plat Skyhammer",
  "f22": "Raptor X",
  "golden f22": "Raptor X",
  "raptor": "Raptor X",
  "super raptor": "Raptor X",
  "f35": "F35 Billion",
  "stealth f35": "F35 Billion",
  "yf-23": "Super YF-23",
  "yf23": "Super YF-23",
  "su47": "Super CFA44",
  "su-24": "S67",
  "su24": "S67",
  "mig29": "Super S67",
  "recon helicopter": "Medic Helicopter",
  "mi-28": "Overwatch",
  "mi28": "Overwatch",
  "boss mi-28": "Overwatch",
  "ka52": "LE Cobra Super",
  "mi35": "LE Cobra",
  "fc31": "F24",
  "f117": "Ghostwind",
  "defiant": "Greyhound",
  "blackbird": "Rainbow Darkstar",
  "ahrlac": "Police AHRLAC",
  "super ahrlac": "Police AHRLAC",
  "ac-119k": "Mothership",
  "ac119k": "Mothership",
  "xb-70": "Tupolev TB3",
  "xb70": "Tupolev TB3",
  "wulf": "Festive BF109",
  "u2": "Super A-14",
  "ufo": "Super Alien",
  "tu-22m": "Super TU-160",
  "tu22m": "Super TU-160",
  "super f15": "Super F111",
  "super f14": "Super F24",
  "stealth f14": "Super F24",
  "stallion": "Super Zhi 19E",
  "golden spitfire": "Festive BF109",
  "atc silkfire": "Skyfox",
  "scorpion": "Super Skyfox",
  "su34": "Super Tupolev",
  "prowler": "Super A37",
  "phantom jet": "Super A50",
  "novablitz": "Super Nova",
  "pelican": "Wrapped C17",
  "miron": "Super B21",
  "ngad": "Top3 GhostWind",
  "mig31": "Super Mig25",
  "me262": "ME323",
  "attack helicopter": "Zhi 19E",
  "blackhawk helicopter": "Chinook CH-47",
  "turret helicopter": "Medic Helicopter",
  "helicopter": "Medic Helicopter",
  "biplane": "Tupolev TB3",
  "fighter biplane": "Tupolev TB3",
  "dive bomber": "Rocket HE177",
  "warplane": "Super He177",
  "b29 bomber": "Super TU95",
  "fx1": "XF12",
  "invictus": "Leonardo",
  "valor": "Super Leonardo",
  "b-17": "Toy B-17",
  "b17": "Toy B-17",
  "toy b-17": "Toy B-17",
  "v22": "Super S.W.A.R.M",
  "ac130": "Zombie AC130",
  "zombie ac130": "Zombie AC130",
  "spitfire": "Festive BF109",
  "spitfire mk2": "Festive BF109",
  "super yf-23": "Super YF-23",
  "rafale": "Super Rafale",
  "snowmobile": "Armored Snow mobile",
  "humvee": "Super AN Jeep",
  "himars": "MLRS",
  "jeep": "Armored Jeep",
  "grapple atv": "ATV",
  "qn506": "Korkut",
  "sea tank": "Tank Boat",
  "rocket truck": "S.A.M. Truck"
};

export const BatchImageUploader: React.FC = () => {
  const { items, batchUpdateThumbnails } = useValueList();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previews, setPreviews] = useState<FileMatchPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search states inside the preview queue
  const [filterTab, setFilterTab] = useState<'all' | 'matched' | 'unmatched' | 'soldiers_drones' | 'vehicles'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Target Item Picker Modal / Dropdown state
  const [pickerTarget, setPickerTarget] = useState<FileMatchPreview | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState<string>('All');

  /**
   * Multi-stage matching engine:
   * 1. Exact case-insensitive match
   * 2. Cleaned base name exact match
   * 3. Normalized string equality match
   * 4. Alias dictionary match
   * 5. Stripped category suffix match (e.g. "Super Ace Pilot Soldier" -> "Super Ace Pilot")
   * 6. Token subset / category-aware fuzzy match
   */
  const matchFileToItem = (fileName: string): { item?: MilitaryItem; type: FileMatchPreview['matchType']; confidence: number } => {
    const rawBase = fileName.replace(/\.[^/.]+$/, '').trim();
    const cleanBase = cleanFileName(fileName);
    const nRaw = normalize(rawBase);
    const nClean = normalize(cleanBase);

    // 1. Direct case-insensitive match
    let match = items.find(i => i.name.toLowerCase() === rawBase.toLowerCase() || i.name.toLowerCase() === cleanBase.toLowerCase());
    if (match) return { item: match, type: 'exact', confidence: 100 };

    // 2. Normalized equality match (e.g. "superacepilot" === "superacepilot")
    match = items.find(i => {
      const nItem = normalize(i.name);
      return nItem === nClean || nItem === nRaw;
    });
    if (match) return { item: match, type: 'normalized', confidence: 95 };

    // 3. Alias dictionary match
    const aliasTarget = ALIASES[cleanBase.toLowerCase()] || ALIASES[rawBase.toLowerCase()] || ALIASES[nClean] || ALIASES[nRaw];
    if (aliasTarget) {
      match = items.find(i => i.name.toLowerCase() === aliasTarget.toLowerCase() || normalize(i.name) === normalize(aliasTarget));
      if (match) return { item: match, type: 'alias', confidence: 90 };
    }

    // 4. Stripped category suffix match (e.g. "Super Ace Pilot Soldier" -> "Super Ace Pilot")
    const strippedBase = cleanBase.replace(/\b(?:soldier|soldiers|drone|drones|troop|troops|unit|units)\b/gi, '').trim();
    if (strippedBase && strippedBase !== cleanBase) {
      const nStripped = normalize(strippedBase);
      match = items.find(i => 
        i.name.toLowerCase() === strippedBase.toLowerCase() || 
        normalize(i.name) === nStripped
      );
      if (match) return { item: match, type: 'exact', confidence: 98 };

      const strippedAlias = ALIASES[strippedBase.toLowerCase()] || ALIASES[nStripped];
      if (strippedAlias) {
        match = items.find(i => i.name.toLowerCase() === strippedAlias.toLowerCase() || normalize(i.name) === normalize(strippedAlias));
        if (match) return { item: match, type: 'alias', confidence: 92 };
      }
    }

    // 5. Category-aware Token subset & fuzzy matching
    const cleanTokens = cleanBase.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
    if (cleanTokens.length > 0) {
      const isSoldierHint = /\b(?:soldier|pilot|trooper|sniper|medic|juggernaut|killer|vampire|werewolf|bunny|hacker|engineer|private|commander|officer|fighter|heavy|pyro|assassin)\b/i.test(fileName);
      const isDroneHint = /\b(?:drone|uav|reaper|stalker)\b/i.test(fileName);

      let bestCandidate: MilitaryItem | null = null;
      let highestScore = 0;

      for (const item of items) {
        const itemTokens = item.name.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
        if (itemTokens.length === 0) continue;

        // Check if item tokens are completely contained in filename tokens
        const matchedItemTokens = itemTokens.filter(t => cleanTokens.includes(t));
        const tokenMatchRatio = matchedItemTokens.length / itemTokens.length;

        // If all item tokens match or high similarity
        if (tokenMatchRatio === 1) {
          let score = 85 - Math.abs(cleanTokens.length - itemTokens.length) * 4;
          
          // Category boosts
          if (isSoldierHint && item.category === 'Soldier') score += 15;
          if (isDroneHint && item.category === 'Drone') score += 20;

          if (score > highestScore) {
            highestScore = score;
            bestCandidate = item;
          }
        }
      }

      if (bestCandidate && highestScore >= 65) {
        return { item: bestCandidate, type: 'fuzzy', confidence: Math.min(highestScore, 94) };
      }
    }

    return { item: undefined, type: 'unmatched', confidence: 0 };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let selectedFiles: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      selectedFiles = Array.from(e.dataTransfer.files);
    } else if (e.target.files) {
      selectedFiles = Array.from(e.target.files);
    }

    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setResultMessage(null);

    const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/') || /\.(webp|png|jpe?g|svg|avif)$/i.test(f.name));

    const loadedPreviews: FileMatchPreview[] = [];

    for (const file of imageFiles) {
      try {
        const dataUrl = await optimizeImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.88 });
        if (dataUrl) {
          const matchResult = matchFileToItem(file.name);
          loadedPreviews.push({
            id: `${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file,
            name: file.name,
            dataUrl,
            matchedItem: matchResult.item,
            matchType: matchResult.type,
            confidence: matchResult.confidence,
            status: matchResult.item ? 'matched' : 'unmatched'
          });
        }
      } catch (err) {
        console.warn('Failed to optimize file:', file.name, err);
      }
    }

    setPreviews(prev => {
      const existingNames = new Set(prev.map(p => p.name));
      const filteredNew = loadedPreviews.filter(p => !existingNames.has(p.name));
      return [...prev, ...filteredNew];
    });

    setIsProcessing(false);
  };

  const handleManuallyAssignItem = (previewId: string, item: MilitaryItem) => {
    setPreviews(prev => prev.map(p => {
      if (p.id === previewId) {
        return {
          ...p,
          matchedItem: item,
          matchType: 'manual',
          confidence: 100,
          status: 'matched'
        };
      }
      return p;
    }));
    setPickerTarget(null);
  };

  const handleRemovePreview = (previewId: string) => {
    setPreviews(prev => prev.filter(p => p.id !== previewId));
  };

  const handleClearUnmatched = () => {
    setPreviews(prev => prev.filter(p => p.status === 'matched'));
  };

  const handleApplyAll = async () => {
    const matchedPreviews = previews.filter(p => p.matchedItem);
    if (matchedPreviews.length === 0) return;

    setIsUploading(true);
    setResultMessage(null);
    setUploadProgress('Preparing upload...');

    try {
      // 1. Upload in chunks of 25 files to prevent request timeouts
      const CHUNK_SIZE = 25;
      let totalSaved = 0;
      const savedFileUrlMap = new Map<string, string>();

      for (let i = 0; i < matchedPreviews.length; i += CHUNK_SIZE) {
        const chunk = matchedPreviews.slice(i, i + CHUNK_SIZE);
        const currentBatch = Math.floor(i / CHUNK_SIZE) + 1;
        const totalBatches = Math.ceil(matchedPreviews.length / CHUNK_SIZE);

        setUploadProgress(`Uploading & caching images (batch ${currentBatch}/${totalBatches}, ${Math.min(i + CHUNK_SIZE, matchedPreviews.length)}/${matchedPreviews.length} files)...`);

        const payload = chunk.map(p => ({
          name: p.name,
          dataUrl: p.dataUrl,
          targetItemId: p.matchedItem?.id,
          targetItemName: p.matchedItem?.name
        }));

        const response = await staffApiFetch('/api/upload-vehicle-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payload })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || `Server failed to save batch ${currentBatch}`);
        }

        // Store returned permanent server URLs
        if (Array.isArray(data.savedFiles)) {
          data.savedFiles.forEach((sf: any) => {
            if (sf.originalName) savedFileUrlMap.set(sf.originalName, sf.url);
            if (sf.filename) savedFileUrlMap.set(sf.filename, sf.url);
          });
        }

        totalSaved += (data.savedCount || chunk.length);
      }

      // 2. Batch update all matched items in React Context, LocalStorage, and Firestore
      setUploadProgress('Updating thumbnails across all catalog cards...');
      const updates: { itemId: string; thumbnail: string }[] = [];

      matchedPreviews.forEach(p => {
        if (p.matchedItem) {
          const serverUrl = savedFileUrlMap.get(p.name) || `/images/vehicles/${encodeURIComponent(p.name)}`;
          updates.push({
            itemId: p.matchedItem.id,
            thumbnail: serverUrl
          });
        }
      });

      if (updates.length > 0) {
        await batchUpdateThumbnails(updates);
      }

      confetti({
        particleCount: 120,
        spread: 85,
        origin: { y: 0.6 }
      });

      setResultMessage({
        type: 'success',
        text: `Successfully uploaded ${totalSaved} image(s) and applied thumbnails to ${updates.length} catalog cards!`
      });
    } catch (err: any) {
      console.error('Batch upload error:', err);
      setResultMessage({
        type: 'error',
        text: `Upload failed: ${err.message || 'Unknown network error'}`
      });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Filtered preview list
  const filteredPreviews = useMemo(() => {
    return previews.filter(p => {
      // Tab filter
      if (filterTab === 'matched' && p.status !== 'matched') return false;
      if (filterTab === 'unmatched' && p.status !== 'unmatched') return false;
      if (filterTab === 'soldiers_drones') {
        const cat = p.matchedItem?.category;
        if (!cat || (cat !== 'Soldier' && cat !== 'Drone')) return false;
      }
      if (filterTab === 'vehicles') {
        const cat = p.matchedItem?.category;
        if (cat === 'Soldier' || cat === 'Drone') return false;
      }

      // Search keyword filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesTarget = p.matchedItem?.name.toLowerCase().includes(q);
        const matchesCategory = p.matchedItem?.category.toLowerCase().includes(q);
        if (!matchesName && !matchesTarget && !matchesCategory) return false;
      }

      return true;
    });
  }, [previews, filterTab, searchFilter]);

  // Filtered items in manual picker modal
  const filteredPickerItems = useMemo(() => {
    return items.filter(item => {
      if (pickerCategoryFilter !== 'All') {
        if (pickerCategoryFilter === 'Soldiers' && item.category !== 'Soldier') return false;
        if (pickerCategoryFilter === 'Drones' && item.category !== 'Drone') return false;
        if (pickerCategoryFilter === 'Vehicles' && (item.category === 'Soldier' || item.category === 'Drone')) return false;
      }
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.rarity.toLowerCase().includes(q);
      }
      return true;
    }).slice(0, 50); // Cap at 50 for quick scrolling
  }, [items, pickerSearch, pickerCategoryFilter]);

  const matchedCount = previews.filter(p => p.status === 'matched').length;
  const unmatchedCount = previews.filter(p => p.status === 'unmatched').length;
  const soldiersDronesCount = previews.filter(p => p.matchedItem?.category === 'Soldier' || p.matchedItem?.category === 'Drone').length;
  const vehiclesCount = previews.filter(p => p.matchedItem && p.matchedItem.category !== 'Soldier' && p.matchedItem.category !== 'Drone').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 text-white relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-mono font-bold">
              <Layers className="w-3.5 h-3.5" /> BULK CATALOG IMAGE SYNC
            </div>
            <h2 className="text-2xl font-black font-['Chakra_Petch'] tracking-tight">
              Upload & Map Catalog Images (Vehicles, Soldiers & Drones)
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Drag & drop multiple image files (<code className="text-orange-400 font-mono">.webp</code>, <code className="text-orange-400 font-mono">.png</code>, <code className="text-orange-400 font-mono">.jpg</code>). The system matches filenames (e.g. <span className="text-neutral-200 font-mono">Super Ace Pilot.webp</span>, <span className="text-neutral-200 font-mono">Super Repair Drone.png</span>, <span className="text-neutral-200 font-mono">LE BISMARCK.webp</span>) to corresponding catalog cards automatically. You can also manually search and re-assign any image.
            </p>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleFileSelect}
        onClick={() => fileInputRef.current?.click()}
        className="p-8 md:p-10 rounded-3xl border-2 border-dashed border-neutral-700 hover:border-orange-500 bg-neutral-900/40 hover:bg-orange-500/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-inner"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/webp,image/png,image/jpeg,image/svg+xml,image/avif"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8" />
        </div>
        <p className="text-base font-bold text-white mb-1 font-['Chakra_Petch']">
          Click to browse or Drag & Drop multiple image files here
        </p>
        <p className="text-xs text-neutral-400 font-mono">
          Supports .webp, .png, .jpg, .avif (Upload all 276+ vehicles, soldiers & drones in one click)
        </p>
      </div>

      {/* Feedback Banner */}
      {resultMessage && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          resultMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {resultMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-xs md:text-sm font-semibold">{resultMessage.text}</span>
        </div>
      )}

      {/* Selected Queue & Matching Stats */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterTab === 'all' ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                All ({previews.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('matched')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                  filterTab === 'matched' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-emerald-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Matched ({matchedCount})
              </button>
              {unmatchedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab('unmatched')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                    filterTab === 'unmatched' ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-amber-400 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Unmatched ({unmatchedCount})
                </button>
              )}
              {soldiersDronesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab('soldiers_drones')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                    filterTab === 'soldiers_drones' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-purple-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" /> Soldiers & Drones ({soldiersDronesCount})
                </button>
              )}
              {vehiclesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab('vehicles')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    filterTab === 'vehicles' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-blue-400 hover:text-white'
                  }`}
                >
                  Vehicles ({vehiclesCount})
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Filter queue..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {unmatchedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearUnmatched}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/40 transition-colors"
                >
                  Clear Unmatched
                </button>
              )}

              <button
                type="button"
                onClick={() => setPreviews([])}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Clear All
              </button>

              <button
                type="button"
                disabled={isUploading || matchedCount === 0}
                onClick={handleApplyAll}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2 font-['Chakra_Petch']"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> {uploadProgress || 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Apply & Save ({matchedCount}) to Catalog Cards
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grid of Preview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 max-h-[560px] overflow-y-auto p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800">
            {filteredPreviews.map((preview) => (
              <div
                key={preview.id}
                className={`relative rounded-2xl p-3 border flex flex-col items-center text-center gap-2 transition-all ${
                  preview.status === 'matched'
                    ? 'bg-neutral-900/90 border-emerald-500/40 hover:border-emerald-400'
                    : 'bg-neutral-900/60 border-amber-500/40 hover:border-amber-400'
                }`}
              >
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemovePreview(preview.id)}
                  title="Remove image from queue"
                  className="absolute top-2 right-2 p-1 rounded-lg bg-neutral-950/80 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Match Type Badge */}
                <div className="absolute top-2 left-2 z-10">
                  {preview.status === 'matched' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> {preview.matchType}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Unmapped
                    </span>
                  )}
                </div>

                {/* Image Thumbnail */}
                <div className="w-full aspect-square rounded-xl bg-neutral-950 p-1.5 flex items-center justify-center overflow-hidden border border-neutral-800 mt-5">
                  <img
                    src={preview.dataUrl}
                    alt={preview.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* File Details & Target Item */}
                <div className="w-full min-w-0 space-y-1">
                  <p className="text-[11px] font-mono font-bold text-neutral-300 truncate" title={preview.name}>
                    {preview.name}
                  </p>

                  {preview.matchedItem ? (
                    <button
                      type="button"
                      onClick={() => setPickerTarget(preview)}
                      className="w-full text-left p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold truncate flex items-center justify-between gap-1 group transition-all"
                      title="Click to change target catalog item"
                    >
                      <span className="truncate">→ {preview.matchedItem.name}</span>
                      <Edit3 className="w-3 h-3 text-emerald-400 shrink-0 opacity-70 group-hover:opacity-100" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickerTarget(preview)}
                      className="w-full p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all animate-pulse"
                      title="Click to search and assign a catalog item"
                    >
                      <Search className="w-3 h-3" /> Select Target Item
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Item Search & Selection Modal */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-['Chakra_Petch'] text-lg font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-orange-400" /> Assign Catalog Item
                </h3>
                <p className="text-xs text-neutral-400">
                  Targeting file: <code className="text-orange-400 font-mono">{pickerTarget.name}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter & Search Box */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {['All', 'Soldiers', 'Drones', 'Vehicles'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPickerCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      pickerCategoryFilter === cat ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type item name (e.g. Super Ace Pilot, LE BISMARCK, Repair Drone)..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Catalog Items List */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {filteredPickerItems.length > 0 ? (
                filteredPickerItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleManuallyAssignItem(pickerTarget.id, item)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950/60 hover:bg-orange-500/10 border border-neutral-800 hover:border-orange-500/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-neutral-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                            {item.category}
                          </span>
                          <span>{item.rarity}</span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No catalog items found matching "{pickerSearch}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
