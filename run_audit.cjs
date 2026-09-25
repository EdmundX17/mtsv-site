const fs = require('fs');

const rawUploadedList = [
"Submarine (C).webp", "Gun Boat.webp", "JetSki.webp", "Hovercraft.webp", "Boat.webp", "Battleship.webp", "Destroyer.webp", "Super Sub.webp", "Battlecruiser.webp", "Sachsen Frigate.webp", "Submarine (Rare).webp", "Missile Boat.webp", "Carrier.webp", "Yamato.webp", "Patria.webp", "North Carolina.webp", "Interceptor.webp", "Zumwalt.webp", "War ship.webp", "Zubr.webp", "Boss North Carolina.webp", "Typhoon.webp", "USS Independence.webp", "Super Patria.webp", "Tank Boat.webp", "Surrogat.webp", "Tralalero.webp", "Super Hovercraft.webp", "Steel Rain.webp", "SSBN.webp", "Stealth Boat.webp", "Recon Destroyer.webp", "Railgun Destroyer.webp", "Nimitz.webp", "LE5000 Izumo.webp", "PACV Craft.webp", "Patriot Boat.webp", "Golden Interceptor.webp", "Gold Typhoon.webp", "Admiral Kuznetsov.webp", "JS Atago.webp", "Attack Submarine.webp", "Corsair.webp", "Alicorn.webp", "Warspite.webp", "USS Missouri.webp", "Armored Corvette.webp", "Super Warship.webp", "UAV Carrier.webp", "SeaBreacher.webp", "Super Recon Destroyer.webp", "Sea Dragon.webp", "Marasesti.webp", "Project 665.webp", "Master Rain.webp", "Nuke Sub.webp", "Drone Carrier.webp", "LE BISMARCK.webp", "Battle Yacht.webp", "Zumwalt X.webp", "Super Yamato.webp", "Corsair X.webp", "Super Warspite.webp", "Super UAV Carrier.webp", "Super Sea Dragon.webp", "Super Stealth Boat.webp", "Super Marasesti.webp", "Super Missouri.webp", "Super Battle Yacht.webp", "Super Drone Carrier.webp", "Railgun-X Destroyer.webp", "SeaBreacher-X.webp", "Gold Izumo.webp", "Nuke Project 665.webp", "Limited SONAR.webp", "LE BISMARCK(G).webp", "Harrier.webp", "Turret Helicopter.webp", "Turret Chinook.webp", "Spitfire MK2.webp", "Invictus.webp", "Fighter Biplane.webp", "Helicopter.webp", "Dive Bomber.webp", "F22.webp", "F16.webp", "Blackhawk Helicopter.webp", "Biplane.webp", "B-17.webp", "Attack Helicopter.webp", "V22.webp", "YF-23.webp", "Warplane.webp", "F35.webp", "Spitfire.webp", "FX1.webp", "Toy B-17.webp", "B29 Bomber.webp", "AC130.webp", "Stealth F35.webp", "SU47.webp", "SU-24.webp", "MIG29.webp", "Recon Helicopter.webp", "Raptor.webp", "MI-28.webp", "KA52.webp", "MI35.webp", "FC31.webp", "Golden F16.webp", "Golden F22.webp", "F18.webp", "F117.webp", "Darkstar Mk2.webp", "Darkstar.webp", "Defiant.webp", "Blackbird.webp", "BOSS MI-28.webp", "AHRLAC.webp", "AC-119K.webp", "Zeplin-X.webp", "Zombie AC130.webp", "YF1.webp", "X59.webp", "XB-70.webp", "War Shrike.webp", "Wulf.webp", "Valor.webp", "Typhoon.webp", "U2.webp", "UFO.webp", "TU95.webp", "TU-22M.webp", "Tixplane.webp", "TU-160.webp", "Super YF-23.webp", "Super F15.webp", "Super Raptor.webp", "Super Tucano.webp", "Super Darkstar MK-2.webp", "Super F14.webp", "Super AHRLAC.webp", "Sukhoi SU25.webp", "Stealth F14.webp", "Stallion.webp", "Golden Spitfire.webp", "Sky Reaper.webp", "Silver Howl.webp", "Skyfox.webp", "ATC Silkfire.webp", "Scorpion.webp", "SeaHawk.webp", "SU57.webp", "SU25.webp", "SU34.webp", "Red F14.webp", "SM-27.webp", "Rocket HE177.webp", "Police Heli.webp", "Prowler.webp", "Rafale.webp", "Platinum F16.webp", "Phantom Jet.webp", "NovaBlitz.webp", "Pelican.webp", "Nova.webp", "Miron.webp", "NGAD.webp", "Mig31.webp", "Mig25.webp", "M50.webp", "ME262.webp", "Lovebird.webp", "MQ4C Jet.webp", "LE Cobra.webp", "Ironhawk.webp", "AA Abram.webp", "Volk.webp", "Truck.webp", "Turret Truck.webp", "Snowmobile.webp", "Tiger Tank.webp", "Sand Hyena.webp", "Leopard Tank.webp", "Humvee.webp", "Himars.webp", "Jeep.webp", "Laser Truck.webp", "Grapple ATV.webp", "Dune Buggy.webp", "Armored Vehicle.webp", "Artillery.webp", "Armored Jeep.webp", "Armored Snowmobile.webp", "ATV.webp", "Green Abram Tank.webp", "APC.webp", "AAV.webp", "T90 Tank.webp", "Rocket Tank.webp", "Terrorbyte.webp", "QN506.webp", "Edjer.webp", "Halftrack.webp", "Missile Truck.webp", "Alvis Stormer.webp", "BOSS Buggy.webp", "AATank.webp", "Abram Tank.webp", "Abram X.webp", "Super Laser Truck.webp", "TKS-20.webp", "Sea Tank.webp", "Striker.webp", "Phanter.webp", "S-Tank Barrage.webp", "Rg-1 Railgun Car.webp", "Pyro Tank.webp", "Minigun Edjer.webp", "Motorbike.webp", "PL-01.webp", "M10 Booker.webp", "Maus Tank.webp", "Challenger.webp", "BOSS Stormer.webp", "Flak Halftrack.webp", "Super Volk.webp", "Weiner Wagon.webp", "Vulcan.webp", "Warmaul.webp", "Stomper.webp", "Vespa TAP.webp", "The Annihilator.webp", "Tank.webp", "Terminator.webp", "TV Tank.webp", "SuperAPC.webp", "T90-M.webp", "Super Striker.webp", "Super TOS1.webp", "Super Speeder.webp", "Super Halftrack.webp", "Super Phanter.webp", "Super Akrep.webp", "Sturmtank.webp", "Super Edjer.webp", "Shopping Cart.webp", "Skynex.webp", "Strela.webp", "Shocker.webp", "Santa Maus.webp", "S.A.M. Truck.webp", "Rocket Truck.webp", "Railgun Tank.webp", "S-tank Gatling.webp", "Police Jeep.webp", "Puma Recon.webp", "RT01.webp", "Patriot truck.webp", "Police APC.webp", "PHL-03.webp", "Pantsir.webp", "PL-01 Liberty.webp", "Medic Truck.webp", "Merkava.webp", "Overlord.webp", "MZKT.webp", "Manti Core.webp", "Liberty Foch.webp", "MLRS.webp", "Love Buggy.webp", "Leopard 2A7.webp", "Keiler.webp", "King Tiger.webp", "Korkut.webp", "Katyusha.webp"
];

const itemsContent = fs.readFileSync("./src/data/militaryItems.ts", "utf8");
const equalPos = itemsContent.indexOf("=");
const start = itemsContent.indexOf("[", equalPos);
const end = itemsContent.lastIndexOf("]");
const items = JSON.parse(itemsContent.substring(start, end + 1));
console.log("Successfully parsed items in militaryItems.ts:", items.length);

const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Check duplicates in uploaded list
const nameFrequency = {};
rawUploadedList.forEach(n => nameFrequency[n] = (nameFrequency[n] || 0) + 1);
const duplicates = Object.entries(nameFrequency).filter(([_, count]) => count > 1);
console.log("Duplicate upload names in user prompt:", duplicates);

// Comprehensive matching logic
const aliases = {
  "warship": "Warship",
  "war ship": "Warship",
  "typhoon (sub)": "Typhoon (Sub)",
  "typhoon": "Typhoon (Sub)",
  "gold typhoon": "Gold Typhoon",
  "boss north carolina": "North Carolina",
  "le bismarck(g)": "LE BISMARCK (G)",
  "le bismarck": "LE BISMARCK",
  "drone carrier": "Drone carrier",
  "super drone carrier": "Super Drone Carrier",
  "corsair x": "Corsair-X",
  "railgun-x destroyer": "Railgun-X Destroyer",
  "seabreacher-x": "SeaBreacher-X",
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

const matchedAssignments = [];
const usedImages = new Set();
const unusedImages = [];
const errors = [];

rawUploadedList.forEach((filename, idx) => {
  const baseName = filename.replace(/\.webp$/i, "").trim();
  const nBase = normalize(baseName);

  // Check direct
  let targetItem = items.find(i => i.name.toLowerCase() === baseName.toLowerCase());
  
  // Check normalized
  if (!targetItem) {
    targetItem = items.find(i => normalize(i.name) === nBase);
  }

  // Check alias
  if (!targetItem && (aliases[baseName.toLowerCase()] || aliases[nBase])) {
    const aliasTarget = aliases[baseName.toLowerCase()] || aliases[nBase];
    targetItem = items.find(i => i.name.toLowerCase() === aliasTarget.toLowerCase() || normalize(i.name) === normalize(aliasTarget));
  }

  if (targetItem) {
    matchedAssignments.push({
      uploadIndex: idx,
      filename,
      baseName,
      matchedItemName: targetItem.name,
      itemId: targetItem.id,
      category: targetItem.category,
      previousThumbnail: targetItem.thumbnail,
      newThumbnail: `/images/vehicles/${filename}`
    });
    usedImages.add(filename);
  } else {
    unusedImages.push(filename);
    errors.push(`Image "${filename}" could not be matched to any vehicle in the database.`);
  }
});

console.log(`Matched Assignments: ${matchedAssignments.length}`);
console.log(`Unique Used Images: ${usedImages.size}`);
console.log(`Unused Images: ${unusedImages.length}`);
console.log(`Errors count: ${errors.length}`);

// Apply updates to items
const matchedMap = new Map();
matchedAssignments.forEach(m => {
  matchedMap.set(m.itemId, m.newThumbnail);
});

let updatedCount = 0;
items.forEach(item => {
  if (matchedMap.has(item.id)) {
    item.thumbnail = matchedMap.get(item.id);
    item.lastUpdated = "2026-08-31";
    updatedCount++;
  }
});

console.log(`Updated ${updatedCount} items in database!`);

const newFileContent = `import { MilitaryItem } from '../types';\n\nexport const INITIAL_MILITARY_ITEMS: MilitaryItem[] = ` + JSON.stringify(items, null, 2) + `;\n`;
fs.writeFileSync("./src/data/militaryItems.ts", newFileContent);

// Write audit report
fs.writeFileSync("final_audit_report.json", JSON.stringify({
  totalUploaded: rawUploadedList.length,
  matchedCount: matchedAssignments.length,
  uniqueUsedImagesCount: usedImages.size,
  unusedImagesCount: unusedImages.length,
  unusedImages,
  duplicates,
  errors,
  matchedAssignments
}, null, 2));

console.log("Successfully updated src/data/militaryItems.ts and generated final_audit_report.json");
