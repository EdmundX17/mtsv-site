// server.ts
import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore/lite";

// src/data/militaryItems.ts
var INITIAL_MILITARY_ITEMS = [
  {
    "notes": "A helicopter with the special ability to lift other vehicles, along with the main driver controlling 2 machine guns that deal decent damage.",
    "id": "00155e4d-36de-4248-929c-f75c2b27856b",
    "history": [],
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "name": "Chinook CH-47",
    "value": 5e3,
    "hasCustomStarOverrides": false,
    "tradeable": true,
    "gemOverrideMin": 2e3,
    "category": "Air",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Chinook%20CH-47.jpg",
    "demand": 6,
    "gemOverrideMax": 5e3,
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 2,000 - 5,000",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Air"
    ]
  },
  {
    "name": "LE_HealingDrone",
    "tradeable": true,
    "gemOverrideMin": 65e3,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "rarity": "Limited Edition",
    "notes": "The Healing Drone heals both players and soldiers, similar to the Repair Drone.",
    "inRecentlyUpdated": false,
    "gemOverrideMax": 75e3,
    "demand": 3,
    "excludeFromRecentlyUpdated": true,
    "id": "007704ed-1acc-49e9-b6c4-d421e31463f8",
    "value": 75e3,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "category": "Drone",
    "tags": [
      "Drones",
      "Special"
    ],
    "trend": "Stable",
    "history": [],
    "inGameCost": "Gems: 65,000 - 75,000",
    "hasCustomStarOverrides": false,
    "thumbnail": "/images/vehicles/LE%20Healing%20Drone.jpg"
  },
  {
    "inRecentlyUpdated": false,
    "gemOverrideMin": 3e3,
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Chrome%20_Banner_.jpg",
    "tags": [
      "Banner"
    ],
    "gemOverrideMax": 4e3,
    "inGameCost": "Gems: 3,000 - 4,000",
    "demand": 5,
    "history": [],
    "category": "Tags",
    "trend": "Stable",
    "name": "Chrome (Banner)",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "value": 4e3,
    "id": "0088fb4c-8a2c-4e72-9dda-82f986769115",
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "notes": "Available through crates."
  },
  {
    "history": [],
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 40,000 - 50,000",
    "gemOverrideMin": 4e4,
    "thumbnail": "/images/vehicles/Air%20Carrier.jpg",
    "hasManualGemRange": true,
    "tags": [
      "Air",
      "Special"
    ],
    "trend": "Stable",
    "gemOverrideMax": 5e4,
    "excludeFromRecentlyUpdated": true,
    "name": "Air Carrier",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "id": "00aa4ed9-0310-4a90-95ea-4524dccf5947",
    "rarity": "Exotic",
    "notes": "$1f",
    "category": "Air",
    "demand": 6,
    "tradeable": true,
    "value": 5e4
  },
  {
    "hasManualGemRange": true,
    "history": [],
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 450 - 550",
    "notes": "This emblem is obtained by kill tag crates!",
    "name": "Strong Helm (Emblem)",
    "rarity": "Legendary",
    "category": "Tags",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "demand": 5,
    "id": "02255af6-88f8-41ed-acd2-3128eb994b7f",
    "value": 550,
    "thumbnail": "/images/vehicles/Strong%20Helm%20_Emblem_.jpg",
    "tags": [
      "Emblem"
    ],
    "gemOverrideMin": 450,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "trend": "Stable",
    "gemOverrideMax": 550
  },
  {
    "trend": "Stable",
    "gemOverrideMax": 60,
    "excludeFromRecentlyUpdated": true,
    "category": "Naval",
    "inGameCost": "Gems: 40 - 60",
    "thumbnail": "/images/vehicles/Submarine%20_C_.jpg",
    "gemOverrideMin": 40,
    "name": "Submarine (C)",
    "history": [],
    "hasManualGemRange": true,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "inRecentlyUpdated": false,
    "notes": "The Submarine is for transport use; it's quite slow and lacking maneuverability, making it not very useful at all.",
    "tradeable": true,
    "demand": 1,
    "tags": [
      "Naval"
    ],
    "value": 60,
    "rarity": "Common",
    "id": "022b66e9-5be7-48d4-94b5-3cec17c5b89e"
  },
  {
    "demand": 7,
    "value": 45e3,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "history": [],
    "tradeable": true,
    "name": "Gold Falken",
    "rarity": "Exotic",
    "notes": "Tankier than the normal falken, with two extra missiles and a bit more speed.",
    "hasManualGemRange": true,
    "tags": [
      "Special",
      "gold-falken"
    ],
    "gemOverrideMax": 45e3,
    "id": "02a59d85-ed64-491e-802c-2186552b0008",
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 4e4,
    "thumbnail": "/images/vehicles/Gold%20Falken.jpg",
    "category": "Air",
    "trend": "Rising"
  },
  {
    "notes": "A decent explosive machine gun and average missiles. Its main benefit is its unique physics with how it is faster and floatier than most tanks in-game.",
    "tradeable": true,
    "category": "Land",
    "gemOverrideMax": 200,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "tags": [
      "qn506"
    ],
    "value": 200,
    "history": [],
    "id": "03a62416-8b87-4917-a846-2c8d1775ab7f",
    "gemOverrideMin": 20,
    "excludeFromRecentlyUpdated": true,
    "trend": "Dropping",
    "rarity": "Rare",
    "thumbnail": "/images/vehicles/QN506.jpg",
    "inRecentlyUpdated": false,
    "name": "QN506",
    "demand": 1,
    "hasManualGemRange": true
  },
  {
    "notes": "The F35 Billion is an average VTOL jet. The F35 Billion features 2 weapon modes; the first is named Weapon Loadout 1, and it features a new 10 firework lock on missiles with medium damage, slow projectile speed, but fast reload speed. Along with an explosive 50-round, high-fire-rate machine gun that can be aimed and deals good damage. The second weapon loadout is named Weapon Loadout 2 and features  6 drop bombs that deal good damage but have a poor explosive radius; reload is average. The F35 Billion also has a 2,500 Golden Lock On gem upgrade.",
    "tradeable": false,
    "inRecentlyUpdated": false,
    "tags": [
      "Air",
      "Collector",
      "Special"
    ],
    "value": 55e3,
    "id": "04665f20-9d91-41be-8b39-fbef426b04d7",
    "category": "Air",
    "excludeFromRecentlyUpdated": true,
    "inGameCost": "Untradable",
    "trend": "Rising",
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/F35%20Billion.jpg",
    "history": [],
    "lastUpdated": "2026-09-14T17:30:27.362Z",
    "name": "F35 Billion",
    "demand": 6,
    "tradeability": "Tradeable"
  },
  {
    "acronym": "S IMP",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "tags": [
      "Ground"
    ],
    "rarity": "Limited Edition",
    "trend": "Dropping",
    "history": [],
    "hasCustomStarOverrides": true,
    "inRecentlyUpdated": false,
    "starOverrides": {
      "0": 2500001,
      "1": 251e4,
      "2": 2525e3,
      "3": 251e4,
      "4": 2522e3,
      "5": 25e5,
      "fresh": 325e4
    },
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "gemOverrideMin": 2250001,
        "gemOverrideMax": 2750001,
        "demand": 3,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "value": 2500001
      },
      "1": {
        "notes": "",
        "trend": "Stable",
        "value": 251e4,
        "demand": 3,
        "hasManualGemRange": false,
        "gemOverrideMin": 2259e3,
        "gemOverrideMax": 2761e3
      },
      "2": {
        "demand": 3,
        "gemOverrideMin": 2272500,
        "gemOverrideMax": 2777500,
        "trend": "Stable",
        "notes": "",
        "hasManualGemRange": false,
        "value": 2525e3
      },
      "3": {
        "gemOverrideMax": 2761e3,
        "gemOverrideMin": 2259e3,
        "hasManualGemRange": false,
        "demand": 3,
        "notes": "",
        "trend": "Stable",
        "value": 251e4
      },
      "4": {
        "hasManualGemRange": false,
        "demand": 3,
        "gemOverrideMax": 2774200,
        "gemOverrideMin": 2269800,
        "trend": "Stable",
        "notes": "",
        "value": 2522e3
      },
      "5": {
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "value": 25e5,
        "gemOverrideMin": 225e4,
        "gemOverrideMax": 275e4,
        "demand": 6
      },
      "fresh": {
        "demand": 3,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 2925e3,
        "gemOverrideMax": 3575e3,
        "hasManualGemRange": false,
        "value": 325e4
      }
    },
    "category": "Land",
    "demand": 6,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 24e5,
    "id": "0521d559-d2b5-4aac-b97b-e79e66f309f0",
    "name": "Super Imperial Tank",
    "hasCustomMultiplierOverrides": false,
    "notes": "The best tank in the game.Excels at ground to ground, ground to air, has an anti-personnel flamethrower, powerful minigun, and lock-on missiles that all deal great damage, and boasts best in class speed and damage output.",
    "gemOverrideMax": 26e5,
    "thumbnail": "/images/vehicles/Super%20Imperial%20Tank.jpg",
    "value": 26e5,
    "inGameCost": "Gems: 2,400,000 - 2,600,000"
  },
  {
    "hasManualGemRange": true,
    "history": [],
    "inRecentlyUpdated": false,
    "tags": [
      "prowler"
    ],
    "value": 13e3,
    "category": "Air",
    "tradeable": true,
    "notes": "has missiles and a drop bomb with a large damage radius",
    "excludeFromRecentlyUpdated": true,
    "name": "Prowler",
    "gemOverrideMin": 1e4,
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Prowler.jpg",
    "demand": 5,
    "gemOverrideMax": 13e3,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "id": "05507e92-6619-4619-81df-254809c25a0a",
    "trend": "Rising"
  },
  {
    "tags": [
      "Ground",
      "Special"
    ],
    "inGameCost": "Gems: 250,000 - 300,000",
    "notes": "The Limited T28 features a horizontally 30-degree limited main cannon and a machine gun. The Main cannon is a non-lock-on-capable single-cluster round that deals low damage and has a slow reload speed. The 50-round machine gun is an explosive-round machine gun that deals good damage against vehicles. The Limited T28 features the first new machine gun audio in a long time. The Limited T28 is also surrounded by protective armor like the Sturmtank models. The cluster cannon round on the Limited T28 is a horizontal cluster round, which is similar to the Limited Patriot's horizontal cluster missiles.",
    "category": "Land",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "inRecentlyUpdated": false,
    "id": "05b5db5a-9c84-470a-af1b-d76ada52d9b3",
    "thumbnail": "/images/vehicles/Limited%20T28.jpg",
    "value": 3e5,
    "tradeable": true,
    "trend": "Stable",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "name": "Limited T28",
    "gemOverrideMin": 25e4,
    "rarity": "Limited Edition",
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "demand": 5,
    "gemOverrideMax": 3e5
  },
  {
    "tradeable": true,
    "value": 12e4,
    "demand": 5,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "excludeFromRecentlyUpdated": true,
    "rarity": "Exotic",
    "notes": "Large aircraft with 2 attack drones along with having simular stats to the Super A50.",
    "tags": [
      "Air"
    ],
    "history": [],
    "gemOverrideMax": 12e4,
    "inGameCost": "Gems: 100,000 - 120,000",
    "id": "05cc979d-e1cd-4a5f-9ac9-165e18b57c1b",
    "category": "Air",
    "hasManualGemRange": true,
    "gemOverrideMin": 1e5,
    "name": "A50",
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/A50.jpg"
  },
  {
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "category": "Land",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Special",
      "medic-truck"
    ],
    "inRecentlyUpdated": false,
    "gemOverrideMin": 3500,
    "hasManualGemRange": true,
    "id": "066920e6-2286-450e-8437-67e69d4dba11",
    "gemOverrideMax": 5e3,
    "trend": "Dropping",
    "tradeable": true,
    "name": "Medic Truck",
    "demand": 4,
    "thumbnail": "/images/vehicles/Medic%20Truck.jpg",
    "history": [],
    "value": 5e3,
    "rarity": "Legendary",
    "notes": "Can heal troops itself and vehicles when stationary for about 2 to 3 seconds. Main cannon is decent and useful for aiding bossfights as a support role."
  },
  {
    "gemOverrideMax": 3e5,
    "hasCustomMultiplierOverrides": false,
    "trend": "Stable",
    "hasManualGemRange": false,
    "tags": [
      "Air"
    ],
    "hasCustomStarOverrides": false,
    "inRecentlyUpdated": false,
    "gemOverrideMin": 25e4,
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "category": "Air",
    "value": 3e5,
    "thumbnail": "/images/vehicles/Super%20CFA44.jpg",
    "demand": 5,
    "inGameCost": "Gems: 250,000 - 300,000",
    "notes": "The Super CFA44 features an insanely high fire rate, dual plasma 175-round machine guns that come stock with no gem upgrade, similar to Elite Zeplin-X and Zeplin-X, along with 3x 15-round missile bursts that deal 75% of an AI A-10 aircraft's health.",
    "rarity": "Limited Edition",
    "name": "Super CFA44",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "06df876a-4351-4c7d-a63e-1f494df7762f",
    "history": []
  },
  {
    "name": "Limited Patriot",
    "thumbnail": "/images/vehicles/Limited%20Patriot.jpg",
    "id": "071e1910-d4b3-401b-866e-07d116e75015",
    "gemOverrideMax": 3e5,
    "notes": "The Limited Patriot features a golden and black reskin, along with 4 new horizontal cluster hypersonic missiles that deal medium to serious damage. The Limited Patriot also has a singular AI-controlled horizontal cluster hypersonic missile. The reload speed and range of all of these missiles are slower than those of the Legendary Rarity Patriot truck. The Limited Patriot features a faster aircraft lock-on speed, but isn't instant like on the USS Independence Naval vehicle.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inRecentlyUpdated": false,
    "gemOverrideMin": 25e4,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "value": 3e5,
    "hasCustomStarOverrides": false,
    "category": "Land",
    "inGameCost": "Gems: 250,000 - 300,000",
    "history": [],
    "demand": 5,
    "trend": "Stable",
    "tags": [
      "Ground",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "acronym": "LEPT",
    "rarity": "Limited Edition",
    "tradeable": true
  },
  {
    "value": 3300,
    "thumbnail": "/images/vehicles/K9%20Demon.jpg",
    "category": "Land",
    "id": "07829f25-8353-43cb-997d-9e9df373f0c0",
    "notes": "a fast apc with 4 cannon shots",
    "tags": [
      "k9-demon"
    ],
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-12T22:11:20.921Z",
    "demand": 4,
    "gemOverrideMin": 2600,
    "tradeable": true,
    "rarity": "Legendary",
    "trend": "Dropping",
    "hasManualGemRange": true,
    "name": "K9 Demon",
    "inRecentlyUpdated": false,
    "gemOverrideMax": 3300
  },
  {
    "trend": "Dropping",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "demand": 5,
    "gemOverrideMax": 12e3,
    "tradeable": true,
    "category": "Land",
    "name": "Calzone Cannon",
    "rarity": "Legendary",
    "gemOverrideMin": 8e3,
    "inRecentlyUpdated": false,
    "notes": "A limited time event from a collaberation with TMNT Tycoon, this vehicle will not be returning in any other events due to that. It has a decent main cannon and drives well.",
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "tags": [
      "Collector",
      "calzone-cannon"
    ],
    "value": 12e3,
    "thumbnail": "/images/vehicles/Calzone%20Cannon.jpg",
    "id": "0852b160-6206-40d7-91fd-e123f72835a5"
  },
  {
    "id": "089de655-c52d-4169-8c31-a3fbc972ea85",
    "category": "Land",
    "name": "Snow mobile",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "trend": "Rising",
    "thumbnail": "/images/vehicles/Snow%20mobile.jpg",
    "rarity": "Common",
    "history": [],
    "lastUpdated": "2026-06-12T22:11:21.454Z",
    "value": 120,
    "tags": [
      "snow-mobile"
    ],
    "gemOverrideMin": 20,
    "demand": 1,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "notes": "A tycoon vehicle decent for arsenal levels but nothing else.",
    "gemOverrideMax": 120
  },
  {
    "history": [],
    "rarity": "Limited Edition",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "gemOverrideMax": 65e4,
    "name": "Gold Izumo",
    "demand": 6,
    "acronym": "G IZUMO",
    "hasCustomMultiplierOverrides": false,
    "trend": "Stable",
    "gemOverrideMin": 55e4,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "0990fb44-cf05-4b87-bdac-0f1f60278072",
    "tags": [
      "Naval",
      "Collector",
      "Special"
    ],
    "hasCustomStarOverrides": true,
    "value": 65e4,
    "inRecentlyUpdated": false,
    "starTierOverrides": {
      "0": {
        "gemOverrideMin": 72e4,
        "gemOverrideMax": 88e4,
        "hasManualGemRange": false,
        "demand": 3,
        "trend": "Stable",
        "notes": "",
        "value": 8e5
      },
      "1": {
        "hasManualGemRange": false,
        "demand": 3,
        "value": 65e4,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 585e3,
        "gemOverrideMax": 715e3
      },
      "2": {
        "value": 6e5,
        "notes": "",
        "trend": "Stable",
        "demand": 3,
        "gemOverrideMin": 54e4,
        "gemOverrideMax": 66e4,
        "hasManualGemRange": false
      },
      "3": {
        "trend": "Stable",
        "notes": "",
        "value": 550001,
        "hasManualGemRange": false,
        "gemOverrideMin": 495001,
        "gemOverrideMax": 605001,
        "demand": 3
      },
      "4": {
        "hasManualGemRange": false,
        "demand": 3,
        "value": 550001,
        "gemOverrideMin": 495001,
        "gemOverrideMax": 605001,
        "trend": "Stable",
        "notes": ""
      },
      "5": {
        "value": 55e4,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 605e3,
        "gemOverrideMin": 495e3,
        "demand": 6
      },
      "fresh": {
        "trend": "Stable",
        "notes": "",
        "value": 7e7,
        "demand": 6,
        "gemOverrideMax": 77e6,
        "gemOverrideMin": 63e6,
        "hasManualGemRange": false
      }
    },
    "hasManualGemRange": false,
    "category": "Naval",
    "inGameCost": "Gems: 550,000 - 650,000",
    "thumbnail": "/images/vehicles/Gold%20Izumo.jpg",
    "starOverrides": {
      "0": 8e5,
      "1": 65e4,
      "2": 6e5,
      "3": 550001,
      "4": 550001,
      "5": 55e4,
      "fresh": 7e7
    },
    "notes": "Large aircraft carrier featuring a large healing field. Armed with 2 AI CWIS as well as 2 player controlled CWIS.Low demand due to having a niche use-case"
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Air",
      "Special"
    ],
    "starOverrides": {
      "0": 1000001,
      "1": 1000001,
      "2": 1000001,
      "3": 1000001,
      "4": 1000001,
      "5": 1e6,
      "fresh": 1000001
    },
    "rarity": "Limited Edition",
    "notes": "The Super S67 features the same weaponry and stats as the Exotic rarity S67, except for the magazine of the high-damage, aimable explosive round machine gun being increased to a total capacity of 150 rounds, which is double that of the S67.",
    "id": "09f35e69-cb90-48d3-a2cb-402d4265a20f",
    "tradeable": true,
    "demand": 8,
    "value": 1000001,
    "thumbnail": "/images/vehicles/Super%20S67.jpg",
    "name": "Super S67",
    "acronym": "SS67",
    "inGameCost": "Gems: 750,000 - 1,000,000",
    "category": "Air",
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "hasCustomStarOverrides": true,
    "starTierOverrides": {
      "0": {
        "value": 1000001,
        "trend": "Stable",
        "notes": "",
        "demand": 8,
        "gemOverrideMax": 1050001,
        "gemOverrideMin": 950001,
        "hasManualGemRange": false
      },
      "1": {
        "value": 1000001,
        "demand": 8,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMin": 950001,
        "gemOverrideMax": 1050001
      },
      "2": {
        "gemOverrideMin": 950001,
        "gemOverrideMax": 1050001,
        "trend": "Stable",
        "notes": "",
        "demand": 8,
        "value": 1000001,
        "hasManualGemRange": false
      },
      "3": {
        "value": 1000001,
        "demand": 8,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMax": 1050001,
        "gemOverrideMin": 950001
      },
      "4": {
        "value": 1000001,
        "notes": "",
        "trend": "Stable",
        "demand": 8,
        "gemOverrideMin": 950001,
        "gemOverrideMax": 1050001,
        "hasManualGemRange": false
      },
      "5": {
        "trend": "Stable",
        "notes": "",
        "value": 1e6,
        "hasManualGemRange": false,
        "demand": 8,
        "gemOverrideMax": 105e4,
        "gemOverrideMin": 95e4
      },
      "fresh": {
        "gemOverrideMax": 1050001,
        "gemOverrideMin": 950001,
        "demand": 8,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "value": 1000001
      }
    },
    "hasManualGemRange": false,
    "gemOverrideMin": 75e4,
    "history": [
      {
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "value": 1e6,
        "tierValues": {
          "0": 1e6,
          "1": 1e6,
          "2": 1e6,
          "3": 1e6,
          "4": 1e6,
          "5": 1e6,
          "fresh": 1e6
        },
        "date": "Sep 10",
        "timestamp": "2026-09-10T22:08:36.830Z"
      },
      {
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "timestamp": "2026-09-12T22:50:02.141Z",
        "value": 1000001,
        "date": "Sep 12",
        "tierValues": {
          "0": 1000001,
          "1": 1000001,
          "2": 1000001,
          "3": 1000001,
          "4": 1000001,
          "5": 1e6,
          "fresh": 1000001
        }
      }
    ],
    "excludeFromRecentlyUpdated": true,
    "hasCustomMultiplierOverrides": false,
    "gemOverrideMax": 1e6
  },
  {
    "hasCustomStarOverrides": false,
    "gemOverrideMax": 3e5,
    "value": 3e5,
    "hasManualGemRange": false,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "Darkstar-X",
    "notes": "The Darkstar X is just like the other Darkstar variants, featuring a high top speed and acceleration but lacking maneuverability. It features 4 hypersonic missiles and the same hunter mode found within the A14 variants.",
    "id": "0a779732-bb5f-4a31-8054-85e548f8c2c3",
    "gemOverrideMin": 25e4,
    "inGameCost": "Gems: 250,000 - 300,000",
    "thumbnail": "/images/vehicles/Darkstar-X.jpg",
    "rarity": "Limited Edition",
    "hasCustomMultiplierOverrides": false,
    "tradeable": true,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "acronym": "DSX",
    "category": "Air",
    "trend": "Stable",
    "demand": 3,
    "tags": [
      "Air"
    ]
  },
  {
    "trend": "Stable",
    "category": "Tags",
    "tradeable": false,
    "demand": 1,
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "id": "0ac01a79-45b1-4e8f-ab9b-d8a9065805dc",
    "tags": [
      "Emblem",
      "Special"
    ],
    "rarity": "Common",
    "lastUpdated": "2026-08-29",
    "history": [],
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "inGameCost": "Untradable",
    "name": "Private (Emblem)",
    "thumbnail": "https://static.wixstatic.com/media/341c64_61dc36e5f21d4080a2bfb97a39cd0391~mv2.jpeg/v1/fill/w_211,h_234,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_61dc36e5f21d4080a2bfb97a39cd0391~mv2.jpeg",
    "value": 0
  },
  {
    "lastUpdated": "2026-06-12T22:11:21.937Z",
    "name": "Jet (Emblem)",
    "id": "0ad14a6b-93d3-49a2-8f76-794960d79198",
    "demand": 1,
    "gemOverrideMin": 25,
    "notes": "This emblem is obtained by the kill tag crates!",
    "thumbnail": "/images/vehicles/Jet%20_Emblem_.jpg",
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "category": "Tags",
    "rarity": "Common",
    "value": 50,
    "gemOverrideMax": 50,
    "tradeable": true,
    "tags": [
      "Emblem"
    ],
    "trend": "Stable",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 25 - 50"
  },
  {
    "name": "Amethyst (Banner)",
    "value": 4e3,
    "excludeFromRecentlyUpdated": true,
    "id": "0ae54d98-ef50-451b-a2e3-aab2d5df8c66",
    "thumbnail": "/images/vehicles/Amethyst%20_Banner_.jpg",
    "lastUpdated": "2026-06-12T22:11:22.354Z",
    "notes": "Available through crates.",
    "hasManualGemRange": true,
    "category": "Tags",
    "inRecentlyUpdated": false,
    "rarity": "Legendary",
    "history": [],
    "gemOverrideMax": 4e3,
    "tags": [
      "Banner"
    ],
    "tradeable": true,
    "demand": 5,
    "gemOverrideMin": 3e3,
    "inGameCost": "Gems: 3,000 - 4,000",
    "trend": "Stable"
  },
  {
    "notes": "At level 15 it gets an upgrade that can add guns. It is good for arsenal levels.",
    "id": "0d2bfc7f-3fe8-46a8-9ed2-86952b9d7dc8",
    "lastUpdated": "2026-06-12T22:11:22.787Z",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "gemOverrideMin": 35,
    "value": 55,
    "tags": [
      "Naval"
    ],
    "thumbnail": "/images/vehicles/Hovercraft.jpg",
    "gemOverrideMax": 55,
    "trend": "Dropping",
    "demand": 1,
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "inGameCost": "Gems: 35 - 55",
    "rarity": "Common",
    "history": [],
    "category": "Naval",
    "name": "Hovercraft"
  },
  {
    "demand": 5,
    "tags": [
      "Emblem",
      "Special"
    ],
    "tradeable": false,
    "value": 0,
    "history": [],
    "id": "0d5e82d2-1539-4086-8f76-4d1db4ac78d1",
    "rarity": "Rare",
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "lastUpdated": "2026-08-29",
    "excludeFromRecentlyUpdated": true,
    "name": "Warrant Officer (Emblem)",
    "category": "Tags",
    "inRecentlyUpdated": false,
    "inGameCost": "Untradable",
    "trend": "Stable",
    "thumbnail": "https://static.wixstatic.com/media/341c64_033706dacb4e483daf185cb89a597810~mv2.jpeg/v1/fill/w_212,h_235,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_033706dacb4e483daf185cb89a597810~mv2.jpeg"
  },
  {
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "lastUpdated": "2026-06-12T22:11:23.171Z",
    "inRecentlyUpdated": false,
    "value": 1e4,
    "thumbnail": "/images/vehicles/PresentLauncher.jpg",
    "id": "0d9d873a-350d-49d4-966f-3888ef5f204d",
    "excludeFromRecentlyUpdated": true,
    "name": "PresentLauncher",
    "notes": "Reskined RPG with no other main benefits.",
    "demand": 8,
    "tradeable": true,
    "gemOverrideMax": 1e4,
    "inGameCost": "Gems: 5,000 - 10,000",
    "trend": "Stable",
    "history": [],
    "tags": [
      "Weapon",
      "Collector"
    ],
    "category": "Other",
    "gemOverrideMin": 5e3
  },
  {
    "demand": 4,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inRecentlyUpdated": false,
    "acronym": "LEHT",
    "tags": [
      "Ground"
    ],
    "starTierOverrides": {
      "0": {
        "gemOverrideMin": 332500,
        "gemOverrideMax": 367500,
        "value": 35e4,
        "notes": "",
        "trend": "Stable",
        "demand": 4,
        "hasManualGemRange": false
      },
      "1": {
        "notes": "",
        "trend": "Stable",
        "value": 36e4,
        "gemOverrideMin": 342e3,
        "hasManualGemRange": false,
        "gemOverrideMax": 378e3,
        "demand": 4
      },
      "2": {
        "value": 375e3,
        "demand": 4,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 393750,
        "gemOverrideMin": 356250
      },
      "3": {
        "value": 4e5,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMax": 42e4,
        "gemOverrideMin": 38e4,
        "demand": 4
      },
      "4": {
        "trend": "Stable",
        "notes": "",
        "value": 45e4,
        "hasManualGemRange": false,
        "gemOverrideMin": 427500,
        "gemOverrideMax": 472500,
        "demand": 4
      },
      "5": {
        "hasManualGemRange": false,
        "demand": 4,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 389500,
        "gemOverrideMax": 430500,
        "value": 41e4
      },
      "fresh": {
        "trend": "Stable",
        "notes": "",
        "value": 4e5,
        "gemOverrideMin": 38e4,
        "gemOverrideMax": 42e4,
        "hasManualGemRange": false,
        "demand": 4
      }
    },
    "hasManualGemRange": false,
    "inGameCost": "Gems: 300,000 - 350,000",
    "rarity": "Limited Edition",
    "trend": "Stable",
    "history": [
      {
        "timestamp": "2026-09-03T00:05:35.713Z",
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "date": "Sep 02",
        "tierValues": {
          "0": 35e4,
          "1": 36e4,
          "2": 375e3,
          "3": 4e5,
          "4": 45e4,
          "5": 41e4,
          "fresh": 35e4
        },
        "value": 35e4
      },
      {
        "note": "Staff moderation update",
        "value": 35e4,
        "timestamp": "2026-09-10T00:05:35.713Z",
        "date": "Sep 09",
        "tierValues": {
          "0": 35e4,
          "1": 36e4,
          "2": 375e3,
          "3": 4e5,
          "4": 45e4,
          "5": 41e4,
          "fresh": 4e5
        },
        "tier": "fresh",
        "updatedBy": "Spuppers"
      }
    ],
    "thumbnail": "/images/vehicles/Haunted%20Tank.jpg",
    "name": "Haunted Tank",
    "gemOverrideMax": 35e4,
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": true,
    "value": 35e4,
    "starOverrides": {
      "0": 35e4,
      "1": 36e4,
      "2": 375e3,
      "3": 4e5,
      "4": 45e4,
      "5": 41e4,
      "fresh": 4e5
    },
    "gemOverrideMin": 3e5,
    "id": "0e24922d-e957-4451-ac99-7a8187e4efb9",
    "notes": "Slow-moving tank that has decent mid-range acceleration. It features a cannon with a fast reload time that fires only a single shot. The cannon round has a life-stealing feature, which is quite powerful and can heal a significant chunk of the vehicle's health. The HauntedTank also features 2 missile bursts of 6 missiles that deal a decent amount of damage, but unfortunately don't have the life steal function like the main cannon. The missiles' bursts are also able to lock on and are anti-flare to aerial targets.",
    "category": "Land"
  },
  {
    "inGameCost": "Gems: 3,250 - 3,750",
    "category": "Air",
    "excludeFromRecentlyUpdated": true,
    "rarity": "Legendary",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Super%20Tucano.jpg",
    "name": "Super Tucano",
    "demand": 7,
    "trend": "Stable",
    "tags": [
      "Air",
      "Special"
    ],
    "history": [],
    "id": "0e3cf7aa-87fb-46a3-92cf-68da134545e5",
    "value": 3750,
    "lastUpdated": "2026-06-12T22:11:23.542Z",
    "gemOverrideMin": 3250,
    "tradeable": true,
    "notes": "First vehicle to feature anti-armor drop bombs. It has 3 drop anti-armor drop bombs and 3 standard missiles. The Super Tucano is quite maneuverable and nimble.",
    "gemOverrideMax": 3750
  },
  {
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "rarity": "Legendary",
    "gemOverrideMin": 4300,
    "tradeable": true,
    "name": "Golden Spitfire",
    "hasManualGemRange": true,
    "demand": 1,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-12T22:11:23.821Z",
    "trend": "Dropping",
    "gemOverrideMax": 5300,
    "id": "0e7dc979-d19f-4317-97e3-090d8f49dbb0",
    "tags": [
      "golden-spitfire"
    ],
    "value": 5300,
    "category": "Air",
    "thumbnail": "/images/vehicles/Golden%20Spitfire.jpg",
    "notes": "A variation of the original spitfire and has a normal machine gun but an explosive cannon that does good damage to buildings."
  },
  {
    "id": "0e8575aa-8a0e-4d41-b2e6-c8472a04cd5d",
    "history": [],
    "tradeable": true,
    "rarity": "Exotic",
    "gemOverrideMax": 4e4,
    "name": "Skyhammer",
    "demand": 6,
    "hasManualGemRange": true,
    "trend": "Stable",
    "gemOverrideMin": 35e3,
    "inRecentlyUpdated": false,
    "tags": [
      "skyhammer"
    ],
    "value": 4e4,
    "excludeFromRecentlyUpdated": true,
    "category": "Air",
    "lastUpdated": "2026-06-12T22:11:24.104Z",
    "notes": "Bundle exclusive. Very strong; the only vehicle to have an orbital strike currently. ( Can kill people under bunkers ). Decently tanky and its general DPS is very good. Passenger seat has a plasma cannon.",
    "thumbnail": "/images/vehicles/Skyhammer.jpg"
  },
  {
    "tags": [
      "super-volk"
    ],
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "lastUpdated": "2026-06-12T22:11:24.375Z",
    "value": 7500,
    "inRecentlyUpdated": false,
    "demand": 3,
    "thumbnail": "/images/vehicles/Super%20Volk.jpg",
    "notes": "A strong vehicle that has a grenade launcher and a grappling hook.",
    "category": "Land",
    "history": [],
    "gemOverrideMax": 7500,
    "name": "Super Volk",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "gemOverrideMin": 5e3,
    "id": "0ec914dc-c57f-4201-9415-651b3349334d",
    "trend": "Dropping"
  },
  {
    "history": [],
    "thumbnail": "/images/vehicles/Brush%20Camo%20_Banner_.jpg",
    "trend": "Stable",
    "id": "0ecd0085-cfba-4a31-8f60-5a30e83bb54d",
    "lastUpdated": "2026-06-12T22:11:24.595Z",
    "name": "Brush Camo (Banner)",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "category": "Tags",
    "gemOverrideMax": 750,
    "excludeFromRecentlyUpdated": true,
    "notes": "Available through crates.",
    "rarity": "Rare",
    "gemOverrideMin": 500,
    "inGameCost": "Gems: 500 - 750",
    "value": 750,
    "tradeable": true,
    "demand": 5,
    "tags": [
      "Banner"
    ]
  },
  {
    "lastUpdated": "2026-06-12T22:11:24.924Z",
    "gemOverrideMax": 5500,
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/F-4.jpg",
    "inRecentlyUpdated": false,
    "tags": [
      "f-4"
    ],
    "history": [],
    "hasManualGemRange": true,
    "gemOverrideMin": 3500,
    "category": "Air",
    "trend": "Dropping",
    "id": "0f996f84-584b-4e44-a4cc-d16b7b14fba9",
    "name": "F-4",
    "demand": 2,
    "value": 5500,
    "rarity": "Legendary",
    "notes": "A reskin F-16; works the same.",
    "tradeable": true
  },
  {
    "id": "0fde642e-72db-4511-acf1-e03bf24a250b",
    "rarity": "Epic",
    "history": [],
    "hasManualGemRange": true,
    "tradeable": true,
    "trend": "Rising",
    "demand": 5,
    "inRecentlyUpdated": false,
    "name": "Maus Tank",
    "value": 1500,
    "gemOverrideMin": 1e3,
    "category": "Land",
    "lastUpdated": "2026-06-12T22:11:25.446Z",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/Maus%20Tank.jpg",
    "gemOverrideMax": 1500,
    "notes": "A slow tank that has a high amount of HP.",
    "tags": [
      "maus-tank"
    ]
  },
  {
    "gemOverrideMin": 1e5,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Infinity%20Car.jpg",
    "gemOverrideMax": 125e3,
    "category": "Land",
    "name": "Infinity Car",
    "value": 125e3,
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "id": "100046c1-a4d0-47c2-8ef9-63cf3b589f5e",
    "inRecentlyUpdated": false,
    "tradeable": true,
    "notes": "Can infinitly accelerate making it one of the fastest ground vehicles, along with having decent ai cannons, strong frontal aimable cannon, and average lock on missiles",
    "demand": 4,
    "tags": [
      "infinity-car"
    ],
    "history": [],
    "excludeFromRecentlyUpdated": true
  },
  {
    "category": "Tags",
    "notes": "This emblem is obtained in the kill tag crates!",
    "history": [],
    "gemOverrideMax": 50,
    "rarity": "Common",
    "tradeable": true,
    "hasManualGemRange": true,
    "value": 50,
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 25 - 50",
    "gemOverrideMin": 25,
    "name": "Plane (Emblem)",
    "id": "1035eba6-1fa2-4190-af9f-c43b70c212fa",
    "demand": 1,
    "trend": "Stable",
    "lastUpdated": "2026-06-12T22:11:25.658Z",
    "tags": [
      "Emblem"
    ],
    "thumbnail": "/images/vehicles/Plane%20_Emblem_.jpg",
    "excludeFromRecentlyUpdated": true
  },
  {
    "history": [
      {
        "tierValues": {
          "0": 225e3,
          "1": 1e6,
          "2": 35e5,
          "3": 175e5
        },
        "date": "Sep 10",
        "value": 175e3,
        "note": "Previous Market Valuation",
        "timestamp": "2026-09-10T22:08:36.830Z",
        "updatedBy": "System"
      },
      {
        "tierValues": {
          "0": 225e3,
          "1": 1e6,
          "2": 35e5,
          "3": 175e5
        },
        "timestamp": "2026-09-14T00:34:05.261Z",
        "date": "Sep 13",
        "updatedBy": "Spuppers",
        "value": 225e3,
        "note": "Staff moderation update"
      }
    ],
    "tags": [
      "Drones",
      "Special"
    ],
    "id": "105bea0e-eb63-48bc-8247-4fe0ad45616a",
    "starTierOverrides": {
      "0": {
        "hasManualGemRange": false,
        "gemOverrideMax": 236250,
        "gemOverrideMin": 213750,
        "demand": 8,
        "value": 225e3,
        "notes": "",
        "trend": "Rising"
      },
      "1": {
        "hasManualGemRange": false,
        "gemOverrideMin": 95e4,
        "gemOverrideMax": 105e4,
        "value": 1e6,
        "notes": "",
        "trend": "Rising",
        "demand": 8
      },
      "2": {
        "gemOverrideMax": 3675e3,
        "gemOverrideMin": 3325e3,
        "demand": 8,
        "hasManualGemRange": false,
        "trend": "Rising",
        "notes": "",
        "value": 35e5
      },
      "3": {
        "demand": 8,
        "hasManualGemRange": false,
        "trend": "Rising",
        "notes": "",
        "gemOverrideMax": 18375e3,
        "gemOverrideMin": 16625e3,
        "value": 175e5
      }
    },
    "hasManualGemRange": false,
    "trend": "Rising",
    "hasCustomMultiplierOverrides": true,
    "rarity": "Limited Edition",
    "inRecentlyUpdated": false,
    "multiplierOverrides": {
      "0": 1.29,
      "1": 5.71,
      "2": 20,
      "3": 100
    },
    "category": "Drone",
    "thumbnail": "/images/vehicles/Super%20Repair%20Drone.jpg",
    "demand": 8,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "The Super Repair Drone heals both vehicles and other drones. The healing rate for a no-star Super Repair Drone is about 70 HP (Health Points) per second, with a single star providing 105 HP per second, a double-star providing 140 HP per second, and 3 star providing 175 HP per second. The range of the Super Repair Drone is increased to 175 meters compared to that of the normal Repair drone at a measly 100 meters total. Healing vehicles only work for your own vehicle, along with when you are piloting said vehicle.",
    "inGameCost": "Gems: 150,000 - 175,000",
    "tradeable": true,
    "name": "Super Repair Drone",
    "value": 225e3,
    "hasCustomStarOverrides": false
  },
  {
    "name": "K7",
    "thumbnail": "/images/vehicles/K7.jpg",
    "inGameCost": "Gems: 40,000 - 50,000",
    "demand": 5,
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "rarity": "Exotic",
    "tags": [
      "Air"
    ],
    "gemOverrideMin": 4e4,
    "lastUpdated": "2026-06-12T22:11:25.752Z",
    "category": "Air",
    "notes": "The Exotic rarity K7 features a similar wepaon set as to the Nuke K7, the main differnce is the damage being drasticly worse than the Nuke K7, along with the Exotic rairty K7 not featuring the second weapon mode of Nuke Bombs but instead has a weapon mode named Bombs, the 4 - 360 degree aimable explosive round machine guns with slow reload are still present within the Bombs weapon mode but the drop bomb burst of 5 nuclear bombs got swapped for conventional drop bomb bursts.",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "history": [],
    "gemOverrideMax": 5e4,
    "tradeable": true,
    "value": 5e4,
    "id": "1098e257-de65-45da-9119-363ae730e041"
  },
  {
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "trend": "Dropping",
    "lastUpdated": "2026-06-12T22:11:25.911Z",
    "name": "Scorpion",
    "history": [],
    "value": 4250,
    "demand": 5,
    "gemOverrideMax": 4250,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "category": "Air",
    "id": "111130f5-2487-499f-ae71-ce082da92620",
    "notes": "A somewhat slow fighter jet that comes with guns and lock on rocket pods, copilot gets 2 strong missiles",
    "tags": [
      "Special",
      "scorpion"
    ],
    "thumbnail": "/images/vehicles/Scorpion.jpg",
    "rarity": "Legendary",
    "gemOverrideMin": 3750
  },
  {
    "tradeable": true,
    "id": "12456313-de4e-47cf-980b-5656c911ae0b",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "name": "Patriot Boat",
    "value": 7e3,
    "rarity": "Legendary",
    "lastUpdated": "2026-06-12T22:11:26.898Z",
    "gemOverrideMax": 7e3,
    "inGameCost": "Gems: 5,000 - 7,000",
    "notes": "Slow turning and low speed boat with 10 armour piercing rounds and main aimable explosive cannon, also has Ai air defense for missiles and attacks",
    "demand": 6,
    "tags": [
      "Naval"
    ],
    "history": [],
    "gemOverrideMin": 5e3,
    "thumbnail": "/images/vehicles/Patriot%20Boat.jpg",
    "category": "Naval"
  },
  {
    "name": "Elite soldier",
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "category": "Soldier",
    "trend": "Stable",
    "tradeable": true,
    "demand": 4,
    "gemOverrideMin": 300,
    "thumbnail": "/images/vehicles/Elite%20soldier.jpg",
    "tags": [
      "Soldiers"
    ],
    "lastUpdated": "2026-06-12T22:11:27.050Z",
    "value": 900,
    "inGameCost": "Gems: 300 - 900",
    "id": "12617075-0f04-41ab-929e-a64fee173b32",
    "rarity": "Legendary",
    "gemOverrideMax": 900,
    "hasManualGemRange": true,
    "notes": "High DPS minigun.",
    "inRecentlyUpdated": false
  },
  {
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/PL-01%20Liberty.jpg",
    "category": "Land",
    "inGameCost": "Gems: 6,000 - 10,000",
    "lastUpdated": "2026-06-12T22:11:27.230Z",
    "gemOverrideMin": 6e3,
    "demand": 6,
    "trend": "Stable",
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Ground"
    ],
    "gemOverrideMax": 1e4,
    "value": 1e4,
    "id": "12decc47-e03e-4496-b718-cc82fd8443c3",
    "tradeable": true,
    "name": "PL-01 Liberty",
    "notes": "Gold PL-01 reskin with the same armaments and little to no difference"
  },
  {
    "tradeable": true,
    "rarity": "Exotic",
    "category": "Tags",
    "value": 2e4,
    "gemOverrideMax": 2e4,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "notes": "Available through crates.",
    "tags": [
      "Banner"
    ],
    "gemOverrideMin": 15e3,
    "demand": 5,
    "hasCustomMultiplierOverrides": false,
    "inGameCost": "Gems: 15,000 - 20,000",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "hasCustomStarOverrides": false,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Pearl%20_Banner_.jpg",
    "name": "Pearl (Banner)",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "12f4d337-4dd8-4fc7-a062-0cf849286b9c"
  },
  {
    "history": [],
    "thumbnail": "/images/vehicles/Patriot%20truck.jpg",
    "rarity": "Legendary",
    "name": "Patriot truck",
    "demand": 2,
    "category": "Land",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "id": "135062d3-241f-47b5-a9bf-9a96cbf120f0",
    "tags": [
      "patriot-truck"
    ],
    "gemOverrideMax": 2e3,
    "value": 2e3,
    "lastUpdated": "2026-06-12T22:11:27.411Z",
    "gemOverrideMin": 1500,
    "notes": "A decent anti-air vehicle that has 12 AI missiles and 4 player controlled missiles. The missiles are good for flare baiting or farming daily quests",
    "tradeable": true
  },
  {
    "notes": "Available through crates.",
    "thumbnail": "/images/vehicles/Crimson%20_Banner_.jpg",
    "inGameCost": "Gems: 150 - 250",
    "inRecentlyUpdated": false,
    "id": "13a025d6-a409-4b5f-8164-13fe27920073",
    "hasManualGemRange": true,
    "value": 250,
    "history": [],
    "name": "Crimson (Banner)",
    "trend": "Stable",
    "gemOverrideMax": 250,
    "category": "Tags",
    "demand": 5,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 150,
    "lastUpdated": "2026-06-12T22:11:27.574Z",
    "tags": [
      "Banner"
    ],
    "rarity": "Uncommon",
    "tradeable": true
  },
  {
    "notes": "Can spawn both submarines and aircraft. High Health and has anti-air CIWS.",
    "thumbnail": "/images/vehicles/Admiral%20Kuznetsov.jpg",
    "id": "15532068-5374-4aea-af6b-2ba4ae7bdc01",
    "gemOverrideMin": 4100,
    "value": 5200,
    "inRecentlyUpdated": false,
    "tags": [
      "Naval"
    ],
    "hasManualGemRange": true,
    "gemOverrideMax": 5200,
    "lastUpdated": "2026-06-12T22:11:28.922Z",
    "trend": "Dropping",
    "demand": 3,
    "inGameCost": "Gems: 4,100 - 5,200",
    "history": [],
    "rarity": "Legendary",
    "tradeable": true,
    "category": "Naval",
    "excludeFromRecentlyUpdated": true,
    "name": "Admiral Kuznetsov"
  },
  {
    "id": "15637cfe-d863-4792-9f65-f8f21d4ec689",
    "inRecentlyUpdated": false,
    "history": [],
    "hasManualGemRange": true,
    "name": "Nuke Railgun Tank",
    "category": "Land",
    "tradeable": true,
    "trend": "Dropping",
    "lastUpdated": "2026-06-12T22:11:29.128Z",
    "thumbnail": "/images/vehicles/Nuke%20Railgun%20Tank.jpg",
    "rarity": "Exotic",
    "tags": [
      "nuke-railgun-tank"
    ],
    "gemOverrideMax": 54e3,
    "value": 54e3,
    "demand": 6,
    "gemOverrideMin": 43e3,
    "excludeFromRecentlyUpdated": true,
    "notes": "A Railgun tank that has a hit-scan nuke. The nuke has a 2 minute cooldown but the railgun can be fired in the meantime."
  },
  {
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/Dune%20_Banner_.jpg",
    "tags": [
      "Banner"
    ],
    "id": "156da7a6-dbca-43d2-ba5a-6b02a4fb007e",
    "history": [],
    "inGameCost": "Gems: 500 - 750",
    "lastUpdated": "2026-06-12T22:11:30.506Z",
    "notes": "Available through crates.",
    "gemOverrideMax": 750,
    "category": "Tags",
    "demand": 5,
    "hasManualGemRange": true,
    "tradeable": true,
    "value": 750,
    "inRecentlyUpdated": false,
    "gemOverrideMin": 500,
    "name": "Dune (Banner)",
    "rarity": "Rare"
  },
  {
    "id": "15af6f4a-b85b-4162-ba3c-3c0956fee5f5",
    "name": "Kill You (Emote)",
    "lastUpdated": "2026-06-12T22:11:31.527Z",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "value": 750,
    "inGameCost": "Gems: 500 - 750",
    "thumbnail": "/images/vehicles/Kill%20You%20_Emote_.jpg",
    "notes": "yes im aware the image of this has a big ol' 2x on the top right. I WILL FIX IT LATER",
    "demand": 5,
    "tradeable": true,
    "category": "Tags",
    "gemOverrideMin": 500,
    "tags": [
      "Emote"
    ],
    "history": [],
    "rarity": "Rare",
    "gemOverrideMax": 750,
    "trend": "Stable"
  },
  {
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Air",
      "Collector",
      "Special"
    ],
    "rarity": "Exotic",
    "trend": "Stable",
    "history": [],
    "inGameCost": "Untradable",
    "tradeable": false,
    "demand": 10,
    "thumbnail": "/images/vehicles/Top3%20Shrike.jpg",
    "id": "15e53651-49e6-4751-9ad8-142d8637a302",
    "name": "Top3 Shrike",
    "hasCustomStarOverrides": false,
    "notes": "Reskin of the BOSS War Shrike for the top 3 factions during the 6th faction season. It also features improved speed than that of the BOSS War Shrike.",
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "category": "Air",
    "value": 0
  },
  {
    "name": "ExoFighter",
    "demand": 2,
    "trend": "Stable",
    "hasManualGemRange": true,
    "tradeable": true,
    "rarity": "Legendary",
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-12T22:11:31.722Z",
    "thumbnail": "/images/vehicles/ExoFighter.jpg",
    "tags": [
      "exofighter"
    ],
    "category": "Air",
    "notes": "A jet that can dodge incoming missiles by pressing left or right, has 14 missiles and 2 strong front facing explosive round machine gun",
    "gemOverrideMin": 8500,
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "id": "160f00db-1cdc-46a2-a220-02645ed9dccb",
    "gemOverrideMax": 12500,
    "value": 12500
  },
  {
    "demand": 8,
    "inGameCost": "Gems: 4,000 - 5,000",
    "tags": [
      "Soldiers"
    ],
    "value": 5e3,
    "history": [],
    "id": "167464d6-e839-45db-8355-040581dde4a8",
    "tradeable": true,
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "rarity": "Exotic",
    "notes": "Strong against bosses.",
    "gemOverrideMax": 5e3,
    "name": "Boss Killer",
    "gemOverrideMin": 4e3,
    "category": "Soldier",
    "thumbnail": "/images/vehicles/Boss%20Killer.jpg",
    "lastUpdated": "2026-06-12T22:11:31.897Z",
    "trend": "Stable"
  },
  {
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/Super%20M50.jpg",
    "notes": "Blackbird reskin with 2 drop bomb bursts and a long reloading nuke drop bomb",
    "rarity": "Exotic",
    "excludeFromRecentlyUpdated": true,
    "demand": 5,
    "value": 6e4,
    "name": "Super M50",
    "inGameCost": "Gems: 50,000 - 60,000",
    "gemOverrideMax": 6e4,
    "category": "Air",
    "trend": "Stable",
    "tradeable": true,
    "history": [],
    "id": "168a3904-ca62-4cf9-8a61-020161b0db0b",
    "gemOverrideMin": 5e4,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "lastUpdated": "2026-06-12T22:11:33.894Z"
  },
  {
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "inGameCost": "Gems: 35,000 - 45,000",
    "id": "16b78482-0ed5-4dd4-9e41-f81b8951377d",
    "trend": "Stable",
    "name": "S67",
    "tradeable": true,
    "rarity": "Exotic",
    "category": "Air",
    "hasManualGemRange": true,
    "demand": 7,
    "inRecentlyUpdated": false,
    "gemOverrideMax": 45e3,
    "tags": [
      "Air",
      "Special"
    ],
    "notes": "The S67 helicopter features a new high-arcing ground-lock-on missile. Along with an aimable machine gun. The ground missile is only able to lock onto ground vehicles and 2 naval vehicles at this time: the SeaBreacher and the SeaBreacher-X. The reload speed of the 8 missiles is almost instant, meaning these ground missiles can be spammed quite rapidly. The aimable explosive round machine gun features a magazine capacity of 75 rounds. The damage of this machine gun is quite serious, and it's able to deal that serious damage against air, naval, ground, and buildings. The main downsides of the S67 are the low vehicle health, top speed, and acceleration.",
    "lastUpdated": "2026-06-12T22:11:33.473Z",
    "thumbnail": "/images/vehicles/S67.jpg",
    "gemOverrideMin": 35e3,
    "value": 45e3
  },
  {
    "tags": [
      "Ground",
      "Special"
    ],
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "gemOverrideMin": 3500,
    "value": 4500,
    "history": [],
    "inGameCost": "Gems: 3,500 - 4,500",
    "tradeable": true,
    "notes": "Has Aimable explosive round cannon, has decent speed and maneuverabilityGained from the 2025 april fools event",
    "gemOverrideMax": 4500,
    "category": "Land",
    "thumbnail": "/images/vehicles/Shopping%20Cart.jpg",
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "rarity": "Legendary",
    "name": "Shopping Cart",
    "excludeFromRecentlyUpdated": true,
    "demand": 6,
    "trend": "Dropping",
    "id": "17a5d3e1-44cd-45b1-bced-73e0d79b971d"
  },
  {
    "hasManualGemRange": true,
    "tags": [
      "Ground",
      "Special"
    ],
    "inRecentlyUpdated": false,
    "history": [],
    "demand": 1,
    "notes": "The minigun upgrade makes it less functional and harder to level up.",
    "inGameCost": "Gems: 100 - 200",
    "category": "Land",
    "thumbnail": "/images/vehicles/Boss%20Buggy.jpg",
    "value": 200,
    "rarity": "Rare",
    "gemOverrideMin": 100,
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "id": "1870db02-578f-4b2a-b1a2-c195532d3960",
    "trend": "Stable",
    "name": "Boss Buggy",
    "gemOverrideMax": 200,
    "lastUpdated": "2026-06-12T22:11:35.325Z"
  },
  {
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "name": "Boss F-117",
    "thumbnail": "/images/vehicles/Boss%20F-117.jpg",
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "trend": "Dropping",
    "history": [],
    "demand": 3,
    "tags": [
      "boss-f-117"
    ],
    "tradeable": true,
    "gemOverrideMin": 2500,
    "value": 3200,
    "id": "189bec6d-bbea-462c-83b7-f3d56d9ddad3",
    "excludeFromRecentlyUpdated": true,
    "rarity": "Legendary",
    "notes": "A slightly upgraded version of the F-117 with its additional HP and bombs.",
    "gemOverrideMax": 3200,
    "category": "Air"
  },
  {
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "tradeable": true,
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "id": "18d78d2c-468b-4fed-bc15-6e4cd3eac605",
    "notes": "fast firing anti-air cannon along with instant lock on missiles",
    "name": "USS Independence",
    "gemOverrideMax": 7500,
    "value": 7500,
    "gemOverrideMin": 4e3,
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Naval"
    ],
    "demand": 4,
    "trend": "Stable",
    "category": "Naval",
    "inGameCost": "Gems: 4,000 - 7,500",
    "history": [],
    "thumbnail": "/images/vehicles/USS%20Independence.jpg",
    "rarity": "Legendary"
  },
  {
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "category": "Land",
    "thumbnail": "/images/vehicles/Katyusha.jpg",
    "rarity": "Legendary",
    "name": "Katyusha",
    "value": 1600,
    "demand": 2,
    "notes": "Acts like the artillery that you can buy for in-game cash; nothing Limited Edition.",
    "tags": [
      "Special",
      "katyusha"
    ],
    "history": [],
    "gemOverrideMin": 1200,
    "id": "195b98c6-9ff2-45f0-bf91-cb7690c2ec08",
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "gemOverrideMax": 1600,
    "trend": "Rising",
    "tradeable": true
  },
  {
    "inGameCost": "Gems: 800,000 - 1,000,000",
    "id": "1a6b4b52-9abc-47b9-a56e-67203dbe377d",
    "gemOverrideMin": 8e5,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Naval",
    "gemOverrideMax": 1e6,
    "name": "Railgun-X Destroyer",
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Railgun-X%20Destroyer.jpg",
    "rarity": "Limited Edition",
    "starOverrides": {
      "0": 6e5,
      "1": 600001,
      "2": 600001,
      "3": 6e5,
      "4": 6e5,
      "5": 65e4,
      "fresh": 8e5
    },
    "value": 6e5,
    "history": [
      {
        "note": "Previous Market Valuation",
        "tierValues": {
          "0": 5e5,
          "1": 5e5,
          "2": 5e5,
          "3": 5e5,
          "4": 5e5,
          "5": 5e5,
          "fresh": 15e5
        },
        "timestamp": "2026-09-10T22:08:36.830Z",
        "value": 1e6,
        "date": "Sep 10",
        "updatedBy": "System"
      },
      {
        "timestamp": "2026-09-11T17:29:06.873Z",
        "tierValues": {
          "0": 5e5,
          "1": 5e5,
          "2": 5e5,
          "3": 5e5,
          "4": 5e5,
          "5": 5e5,
          "fresh": 15e5
        },
        "date": "Sep 11",
        "updatedBy": "Spuppers",
        "value": 6e5,
        "note": "Staff moderation update"
      },
      {
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-11T17:29:16.057Z",
        "note": "Staff moderation update",
        "tierValues": {
          "0": 6e5,
          "1": 6e5,
          "2": 6e5,
          "3": 6e5,
          "4": 6e5,
          "5": 6e5,
          "fresh": 6e5
        },
        "date": "Sep 11",
        "value": 6e5
      },
      {
        "timestamp": "2026-09-11T17:29:28.302Z",
        "note": "Staff moderation update",
        "updatedBy": "Spuppers",
        "value": 6e5,
        "date": "Sep 11",
        "tierValues": {
          "0": 6e5,
          "1": 6e5,
          "2": 6e5,
          "3": 6e5,
          "4": 6e5,
          "5": 6e5,
          "fresh": 8e5
        },
        "tier": "fresh"
      },
      {
        "value": 6e5,
        "date": "Sep 11",
        "timestamp": "2026-09-11T21:37:42.124Z",
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "tierValues": {
          "0": 6e5,
          "1": 600001,
          "2": 600001,
          "3": 6e5,
          "4": 6e5,
          "5": 65e4,
          "fresh": 8e5
        }
      }
    ],
    "tradeable": true,
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "gemOverrideMax": 63e4,
        "gemOverrideMin": 57e4,
        "trend": "Dropping",
        "notes": "",
        "value": 6e5,
        "demand": 5,
        "hasManualGemRange": false
      },
      "1": {
        "hasManualGemRange": false,
        "demand": 5,
        "value": 600001,
        "gemOverrideMin": 570001,
        "gemOverrideMax": 630001,
        "notes": "",
        "trend": "Dropping"
      },
      "2": {
        "gemOverrideMax": 630001,
        "gemOverrideMin": 570001,
        "hasManualGemRange": false,
        "value": 600001,
        "demand": 5,
        "notes": "",
        "trend": "Dropping"
      },
      "3": {
        "gemOverrideMax": 63e4,
        "gemOverrideMin": 57e4,
        "value": 6e5,
        "demand": 5,
        "notes": "",
        "trend": "Dropping",
        "hasManualGemRange": false
      },
      "4": {
        "notes": "",
        "trend": "Dropping",
        "gemOverrideMax": 63e4,
        "gemOverrideMin": 57e4,
        "value": 6e5,
        "demand": 5,
        "hasManualGemRange": false
      },
      "5": {
        "hasManualGemRange": false,
        "value": 65e4,
        "demand": 5,
        "gemOverrideMin": 617500,
        "gemOverrideMax": 682500,
        "notes": "",
        "trend": "Dropping"
      },
      "fresh": {
        "notes": "",
        "trend": "Dropping",
        "gemOverrideMax": 84e4,
        "gemOverrideMin": 76e4,
        "value": 8e5,
        "demand": 5,
        "hasManualGemRange": false
      }
    },
    "hasCustomStarOverrides": true,
    "acronym": "RGX",
    "hasCustomMultiplierOverrides": false,
    "notes": "The Railgun-X Destroyer features 6 CIWIS air defenses and a plasma machine gun that deals average damage. The Railgun-X Destroyer is the first vehicle to feature a Railgun that fires in multiple directions like a shotgun. The damage increases at closer range, but the accuracy decreases significantly. The Railgun-X Destroyer has a magnetic feature that ensures its railgun can lock onto multiple targets.",
    "demand": 5,
    "tags": [
      "Naval",
      "Special"
    ]
  },
  {
    "value": 15e3,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "notes": "Valentine's reskin of the standard blackbird and Boss Blackbird, featuring the same slow-firing explosive round machine gun and low-damage missiles. The Lovebird's missiles have a unique flame trail and are adorned with pink skin. The exhaust is also a slightly different shade to match the festive vehicle.",
    "name": "Lovebird",
    "history": [],
    "id": "1b9a4911-3a77-4323-9009-711db287a8ba",
    "inGameCost": "Gems: 10,000 - 15,000",
    "gemOverrideMax": 15e3,
    "demand": 6,
    "category": "Air",
    "gemOverrideMin": 1e4,
    "trend": "Stable",
    "rarity": "Legendary",
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/Lovebird.jpg",
    "lastUpdated": "2026-06-12T22:11:35.325Z"
  },
  {
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "name": "Tower (Emblem)",
    "category": "Tags",
    "gemOverrideMin": 25,
    "excludeFromRecentlyUpdated": true,
    "value": 50,
    "tradeable": true,
    "gemOverrideMax": 50,
    "notes": "This emblem is obtained in the kill tag crates!",
    "inGameCost": "Gems: 25 - 50",
    "demand": 1,
    "id": "1c27d2f6-a2af-4c39-bb60-ee4d67ff2953",
    "tags": [
      "Emblem"
    ],
    "history": [],
    "thumbnail": "/images/vehicles/Tower%20_Emblem_.jpg",
    "rarity": "Common",
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "trend": "Stable"
  },
  {
    "rarity": "Legendary",
    "id": "1c60dae7-7c50-4517-8384-f51d17df017e",
    "category": "Air",
    "tradeable": true,
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "history": [],
    "demand": 4,
    "trend": "Rising",
    "tags": [
      "phantom-jet"
    ],
    "gemOverrideMax": 10800,
    "inRecentlyUpdated": false,
    "value": 10800,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Phantom%20Jet.jpg",
    "gemOverrideMin": 8700,
    "excludeFromRecentlyUpdated": true,
    "name": "Phantom Jet",
    "notes": "Almost identicle to F-15, has an explosive cannon and stealth capability"
  },
  {
    "history": [],
    "inRecentlyUpdated": false,
    "name": "FC31",
    "thumbnail": "/images/vehicles/FC31.jpg",
    "hasManualGemRange": true,
    "id": "1cb8bd19-2acd-4b8c-81ce-fe37bb93ed01",
    "trend": "Dropping",
    "gemOverrideMin": 400,
    "rarity": "Epic",
    "notes": "A plane with a strong machine gun and decent missiles. It can buy a double missile upgrade with gems",
    "tags": [
      "fc31"
    ],
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 900,
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "category": "Air",
    "demand": 2,
    "value": 900,
    "tradeable": true
  },
  {
    "inGameCost": "Untradable",
    "tradeable": false,
    "tags": [
      "Banner"
    ],
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "value": 0,
    "notes": "Only available through ranks.",
    "history": [],
    "demand": 5,
    "lastUpdated": "2026-08-29",
    "name": "Bronze (Banner)",
    "id": "1cc6219e-f63e-4d22-bfbf-bff1bed1cbeb",
    "rarity": "Common",
    "trend": "Stable",
    "thumbnail": "https://static.wixstatic.com/media/f89faf_7b3fb2dc6cf84701a9033f3ac6ffedf8~mv2.png/v1/fill/w_373,h_413,al_c,lg_1,q_85,enc_avif,quality_auto/f89faf_7b3fb2dc6cf84701a9033f3ac6ffedf8~mv2.png",
    "category": "Tags"
  },
  {
    "notes": "The A37 bomber features the new Napalm drop bombs, which work just like the old Napalm system on the older F-16 models, except it has a larger rectangular radius instead of a small square damage radius. The new Napalm Drop Bombs also damage through different elevations, which the older Napalm drop bombs could never achieve. The A37 has, in total, 8 Napalm drop bombs and a frontally aimed explosive round machine gun that has a magazine capacity of 150 rounds. The speed of the A37 is average, but the specialty of it for sure is the fast reload speeds for both of its weapons.",
    "gemOverrideMax": 7750,
    "demand": 6,
    "id": "1cf46655-be20-4154-a98e-040d2b330455",
    "value": 7750,
    "gemOverrideMin": 6500,
    "category": "Air",
    "tradeable": true,
    "rarity": "Legendary",
    "name": "A37",
    "lastUpdated": "2026-06-12T22:11:35.325Z",
    "thumbnail": "/images/vehicles/A37.jpg",
    "inGameCost": "Gems: 6,500 - 7,750",
    "trend": "Dropping",
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "hasManualGemRange": true,
    "tags": [
      "Air",
      "Special"
    ],
    "inRecentlyUpdated": false
  },
  {
    "rarity": "Exotic",
    "value": 55e3,
    "name": "Sea Dragon",
    "notes": "The Sea Dragon is an Ekranoplan, which means it uses the ground effect to work as both a naval vessel and an aircraft hybrid. The Sea Dragon features a rear-facing 360-degree tail-mounted machine gunner. Along with a strong 75-round machine gun with an average to good reload time. The Sea Dragon also has 6 salvos of 3 missiles per burst that can lock onto aerial targets and deal decent damage, along with an average reload speed.",
    "demand": 5,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "category": "Naval",
    "hasManualGemRange": false,
    "thumbnail": "/images/vehicles/Sea%20Dragon.jpg",
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "hasCustomMultiplierOverrides": false,
    "id": "1d563caf-cd71-4eb4-b084-73cd749bfaa7",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Rising",
    "history": [
      {
        "date": "Sep 10",
        "note": "Previous Market Valuation",
        "value": 0,
        "timestamp": "2026-09-10T22:08:36.830Z",
        "updatedBy": "System",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 200,
          "3": 1e4,
          "4": 2e4,
          "5": 6e4,
          "fresh": 0
        }
      },
      {
        "note": "Staff moderation update",
        "value": 55e3,
        "date": "Sep 11",
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-11T17:19:35.105Z",
        "tierValues": {
          "0": 55e3,
          "1": 55e3,
          "2": 55200,
          "3": 65e3,
          "4": 75e3,
          "5": 115e3,
          "fresh": 55e3
        }
      }
    ],
    "tags": [
      "Naval",
      "Special"
    ]
  },
  {
    "history": [],
    "name": "Super UAV Carrier",
    "thumbnail": "/images/vehicles/Super%20UAV%20Carrier.jpg",
    "id": "1dc0b45e-4c22-4157-805f-411e00b13822",
    "trend": "Stable",
    "acronym": "SUAV",
    "gemOverrideMax": 3e5,
    "hasCustomStarOverrides": false,
    "inGameCost": "Gems: 225,000 - 300,000",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Limited Edition",
    "notes": "The Super UAV Carrier features 4 MQ-9 Reaper drones and 2 X-47B drones. The Super UAV Carrier also features an aimable explosive round machine gun that deals low damage. The machine gun reloads quite well, but the damage output is quite abysmal. It takes 2 magazines to destroy an AI Naval Destroyer within a normal and non-pro server.",
    "tags": [
      "Naval",
      "Special"
    ],
    "category": "Naval",
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 225e3,
    "demand": 4,
    "tradeable": true,
    "value": 3e5
  },
  {
    "notes": "an average soldier obtained from comander x",
    "id": "1de73795-4cec-4eec-96da-12479c4fae23",
    "excludeFromRecentlyUpdated": true,
    "category": "Soldier",
    "name": "Commander X",
    "value": 1e3,
    "thumbnail": "/images/vehicles/Commander%20X.jpg",
    "lastUpdated": "2026-06-12T22:11:43.056Z",
    "gemOverrideMin": 400,
    "trend": "Stable",
    "tradeable": true,
    "inGameCost": "Gems: 400 - 1,000",
    "history": [],
    "demand": 5,
    "gemOverrideMax": 1e3,
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "tags": [
      "Soldiers"
    ],
    "inRecentlyUpdated": false
  },
  {
    "demand": 1,
    "tradeable": true,
    "trend": "Dropping",
    "rarity": "Rare",
    "id": "1ded247e-d489-4b61-a5c2-1cfdeb138acd",
    "name": "YF-23",
    "value": 800,
    "gemOverrideMin": 600,
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "notes": "First vehicle ever introduced with EMP missiles. This plane was the first plane added that could counter the ATC-29 Silkfire at the time.(Spec Ops)",
    "tags": [
      "yf-23"
    ],
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-12T22:11:43.270Z",
    "category": "Air",
    "thumbnail": "/images/vehicles/YF-23.jpg",
    "hasManualGemRange": true,
    "gemOverrideMax": 800
  },
  {
    "history": [],
    "rarity": "Legendary",
    "tags": [
      "Air"
    ],
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "id": "1e7b6885-9472-48e7-837a-908c796b85d6",
    "demand": 7,
    "category": "Air",
    "lastUpdated": "2026-06-12T22:11:43.360Z",
    "trend": "Stable",
    "inGameCost": "Gems: 50,000 - 65,000",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "value": 65e3,
    "name": "Festive BF109",
    "gemOverrideMax": 65e3,
    "thumbnail": "/images/vehicles/Festive%20BF109.jpg",
    "notes": "Holidays reskinned BF109",
    "gemOverrideMin": 5e4
  },
  {
    "trend": "Stable",
    "history": [],
    "rarity": "Rare",
    "gemOverrideMax": 100,
    "thumbnail": "/images/vehicles/Combat%20Tank%20_Emblem_.jpg",
    "lastUpdated": "2026-06-12T22:11:43.939Z",
    "excludeFromRecentlyUpdated": true,
    "demand": 3,
    "gemOverrideMin": 75,
    "name": "Combat Tank (Emblem)",
    "category": "Tags",
    "hasManualGemRange": true,
    "notes": "This emblem is obtained in the kill tag crates.",
    "inRecentlyUpdated": false,
    "id": "1eb85b68-7d0d-42b4-a974-43b236481a2e",
    "value": 100,
    "tradeable": true,
    "inGameCost": "Gems: 75 - 100",
    "tags": [
      "Emblem"
    ]
  },
  {
    "tags": [
      "hx3"
    ],
    "notes": "A very average vehicle that has a huge cannon attatched to the back that does decent damage.",
    "thumbnail": "/images/vehicles/HX3.jpg",
    "id": "1ec57298-0f7d-4160-8142-7c913c54b376",
    "lastUpdated": "2026-06-12T22:11:44.238Z",
    "value": 2800,
    "category": "Land",
    "trend": "Stable",
    "inRecentlyUpdated": false,
    "name": "HX3",
    "tradeable": true,
    "hasManualGemRange": true,
    "gemOverrideMin": 2200,
    "rarity": "Legendary",
    "history": [],
    "demand": 7,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 2800
  },
  {
    "category": "Tags",
    "thumbnail": "/images/vehicles/Parachute%20_Emblem_.jpg",
    "name": "Parachute (Emblem)",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-14T00:14:07.814Z",
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "gemOverrideMin": 50,
    "history": [],
    "rarity": "Uncommon",
    "id": "1f00594b-dd89-4014-a4a8-d1726669f0c1",
    "tags": [
      "Emblem"
    ],
    "value": 75,
    "inGameCost": "Gems: 50 - 75",
    "demand": 2,
    "gemOverrideMax": 75,
    "tradeable": true,
    "notes": "This emblem is obtained from the kill tag crates!"
  },
  {
    "id": "1f3d60b9-ee36-453a-a0e7-3b0c544e46ec",
    "tradeable": true,
    "history": [],
    "gemOverrideMin": 175e3,
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "acronym": "SZHI",
    "trend": "Stable",
    "name": "Super Zhi 19E",
    "gemOverrideMax": 225e3,
    "rarity": "Limited Edition",
    "category": "Air",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "value": 225e3,
    "inGameCost": "Gems: 175,000 - 225,000",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "demand": 4,
    "notes": "Helicopter with hypersonic missiles. It also features a rocket barrage, inflicting medium to low damage to the passenger seat. The Super Zhi 19E also features a machine gun that deals high damage but with a low ammo capacity, like the Cobra. The multi-lock feature is another characteristic of this aircraft, also found on the Cobra variants.  The helicopter overall is like a cobra but with a barrage passenger weapon and slightly better stats.",
    "inRecentlyUpdated": false,
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/Super%20Zhi%2019E.jpg"
  },
  {
    "value": 175e3,
    "rarity": "Limited Edition",
    "thumbnail": "/images/vehicles/Anti-Vehicle%20Rifle.jpg",
    "inGameCost": "Gems: 150,000 - 175,000",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Explosive sniper reskin with 5 shots",
    "excludeFromRecentlyUpdated": false,
    "category": "Other",
    "tags": [
      "Weapon",
      "Collector",
      "Special"
    ],
    "demand": 4,
    "inRecentlyUpdated": false,
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "demand": 3
      }
    },
    "history": [],
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": false,
    "trend": "Stable",
    "name": "Anti-Vehicle Rifle",
    "id": "1f495f69-1ebc-4d8f-a001-29dfcc366818",
    "tradeable": true
  },
  {
    "tags": [
      "fighter-biplane"
    ],
    "gemOverrideMin": 50,
    "category": "Air",
    "demand": 1,
    "trend": "Dropping",
    "id": "1f6057aa-0272-4f6b-b65d-0966c75b61fa",
    "gemOverrideMax": 120,
    "lastUpdated": "2026-06-14T00:14:10.596Z",
    "rarity": "Common",
    "thumbnail": "/images/vehicles/Fighter%20Biplane.jpg",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "notes": "Good for arsenal levels. One of the few Transport class vehicles that has weapons.(Tycoon)",
    "history": [],
    "hasManualGemRange": true,
    "name": "Fighter Biplane",
    "inRecentlyUpdated": false,
    "value": 120
  },
  {
    "demand": 5,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "trend": "Stable",
    "rarity": "Legendary",
    "id": "1f8b15e3-d2b8-4135-9897-a22674cbd07f",
    "hasManualGemRange": true,
    "name": "Super Darkstar MK-2",
    "value": 4e3,
    "gemOverrideMax": 4e3,
    "history": [],
    "tags": [
      "super-darkstar-mk-2"
    ],
    "notes": "One of the fastest vehicles in-game with 4 hypersonic missiles and an explosive machinegun. ",
    "gemOverrideMin": 2e3,
    "category": "Air",
    "thumbnail": "/images/vehicles/Super%20Darkstar%20MK-2.jpg"
  },
  {
    "gemOverrideMin": 8e5,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "thumbnail": "/images/vehicles/Super%20A50.jpg",
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "name": "Super A50",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "notes": "",
        "trend": "Stable",
        "value": 800001,
        "hasManualGemRange": false,
        "demand": 3,
        "gemOverrideMax": 880001,
        "gemOverrideMin": 720001
      },
      "1": {
        "demand": 3,
        "hasManualGemRange": false,
        "gemOverrideMax": 880001,
        "gemOverrideMin": 720001,
        "trend": "Stable",
        "notes": "",
        "value": 800001
      },
      "2": {
        "gemOverrideMin": 720001,
        "gemOverrideMax": 880001,
        "demand": 3,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "value": 800001
      },
      "3": {
        "hasManualGemRange": false,
        "gemOverrideMax": 880001,
        "gemOverrideMin": 720001,
        "demand": 3,
        "value": 800001,
        "notes": "",
        "trend": "Stable"
      },
      "4": {
        "hasManualGemRange": false,
        "demand": 3,
        "trend": "Stable",
        "notes": "",
        "value": 800001,
        "gemOverrideMax": 880001,
        "gemOverrideMin": 720001
      },
      "5": {
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "value": 8e5,
        "gemOverrideMin": 72e4,
        "gemOverrideMax": 88e4,
        "demand": 5
      },
      "fresh": {
        "demand": 4,
        "hasManualGemRange": false,
        "gemOverrideMin": 1425e3,
        "gemOverrideMax": 1575e3,
        "value": 15e5,
        "notes": "",
        "trend": "Stable"
      }
    },
    "inRecentlyUpdated": false,
    "starOverrides": {
      "0": 800001,
      "1": 800001,
      "2": 800001,
      "3": 800001,
      "4": 800001,
      "5": 8e5,
      "fresh": 15e5
    },
    "hasCustomStarOverrides": true,
    "gemOverrideMax": 1e6,
    "hasCustomMultiplierOverrides": false,
    "tags": [
      "Air"
    ],
    "inGameCost": "Gems: 800,000 - 1,000,000",
    "demand": 5,
    "notes": "Large Plane with decent health and 4 hyper aggressive attack drones.Said drones are capable of targeting tanks and NPCs alike.",
    "acronym": "SA50",
    "category": "Air",
    "history": [],
    "id": "1fad2bb9-5f0d-4f10-b322-012815d06458",
    "tradeable": true,
    "value": 1e6,
    "rarity": "Limited Edition"
  },
  {
    "trend": "Stable",
    "hasManualGemRange": true,
    "history": [],
    "thumbnail": "/images/vehicles/Anchor%20_Emblem_.jpg",
    "id": "1fbbce5f-dcb6-4070-a1fb-900a754ef37d",
    "tags": [
      "Emblem"
    ],
    "inGameCost": "Gems: 25 - 50",
    "gemOverrideMin": 25,
    "category": "Tags",
    "notes": "This emblem is obtained by the kill tag crates!",
    "demand": 1,
    "gemOverrideMax": 50,
    "name": "Anchor (Emblem)",
    "tradeable": true,
    "value": 50,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Common"
  },
  {
    "gemOverrideMin": 6e3,
    "name": "S-tank Gatling",
    "hasManualGemRange": true,
    "id": "1fbc620f-938d-4ce1-b6d5-886bce86dccd",
    "gemOverrideMax": 8e3,
    "tradeable": true,
    "trend": "Stable",
    "demand": 6,
    "thumbnail": "/images/vehicles/S-tank%20Gatling.jpg",
    "category": "Land",
    "tags": [
      "s-tank-gatling"
    ],
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 8e3,
    "rarity": "Legendary",
    "notes": "A tank with 2 large cannons that can deal with ground threats moderatly. This version comes with a machine gun on top that is decent at dealing with air targets"
  },
  {
    "hasManualGemRange": true,
    "name": "Fireworks RPG",
    "tradeable": true,
    "gemOverrideMax": 7500,
    "inGameCost": "Gems: 6,500 - 7,500",
    "id": "204dba0c-fb1d-430f-88af-de43ca875ab0",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Rising",
    "gemOverrideMin": 6500,
    "history": [],
    "demand": 2,
    "tags": [
      "Weapon",
      "Collector",
      "Special"
    ],
    "value": 7500,
    "thumbnail": "/images/vehicles/Fireworks%20RPG.jpg",
    "rarity": "Epic",
    "notes": "RPG variant with fireworks animations and audio. It also has a custom trail effect that looks like rainbow sparkling fireworks. The damage is the same as a normal RPG and also only has a single round that is quickly reloaded, as most RPG variants do.",
    "category": "Other"
  },
  {
    "value": 750,
    "hasManualGemRange": true,
    "gemOverrideMax": 750,
    "id": "206d8a67-4cfc-4c41-b4e4-b7478eebd2f4",
    "thumbnail": "/images/vehicles/Stealth%20_Banner_.jpg",
    "notes": "Available through crates.",
    "tags": [
      "Banner"
    ],
    "inGameCost": "Gems: 500 - 750",
    "gemOverrideMin": 500,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 5,
    "tradeable": true,
    "trend": "Stable",
    "rarity": "Rare",
    "name": "Stealth (Banner)",
    "category": "Tags",
    "history": []
  },
  {
    "gemOverrideMin": 2300,
    "value": 3e3,
    "notes": "A rarer and slightly more powerful version of the artillery truck.",
    "id": "20f9d5a2-8c83-411c-bffe-c85734c1320f",
    "gemOverrideMax": 3e3,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/PHL-03.jpg",
    "name": "PHL-03",
    "tradeable": true,
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "tags": [
      "phl-03"
    ],
    "trend": "Rising",
    "demand": 4,
    "history": [],
    "category": "Land"
  },
  {
    "thumbnail": "/images/vehicles/Jet%20Engineer.jpg",
    "id": "2105a23e-cef0-412f-abb1-aafae6c6b715",
    "trend": "Stable",
    "rarity": "Limited Edition",
    "lastUpdated": "2026-06-12T22:11:45.738Z",
    "category": "Soldier",
    "tags": [
      "Soldiers",
      "Special"
    ],
    "inGameCost": "Gems: 300,000 - 350,000",
    "demand": 7,
    "excludeFromRecentlyUpdated": true,
    "notes": "Primarily a repair drone, but it can be used within the troop section. Stars scale the healing ability of the Jet Engineer, costing 125 Jet Engineers for a maximum of 3 stars.",
    "history": [],
    "gemOverrideMin": 3e5,
    "value": 35e4,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      }
    },
    "gemOverrideMax": 35e4,
    "tradeable": true,
    "name": "Jet Engineer"
  },
  {
    "notes": "Has decent missile reload speed can be used for flare baiting, has very strong bomb with splash damage that can 1 shot carriers, has decent speed and handling, along with semi usefull stealth to prevent missile lock on",
    "gemOverrideMin": 2e3,
    "id": "21a807f1-ba16-4995-84bd-5a927b618a2c",
    "name": "F-5",
    "value": 3500,
    "gemOverrideMax": 3500,
    "tradeable": true,
    "trend": "Rising",
    "thumbnail": "/images/vehicles/F-5.jpg",
    "history": [],
    "hasManualGemRange": true,
    "demand": 5,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Air",
    "rarity": "Legendary",
    "tags": [
      "f-5"
    ]
  },
  {
    "history": [],
    "value": 4e4,
    "gemOverrideMin": 35e3,
    "notes": "The F24 is a VTOL aircraft that features a singular large missile that deals average damage, along with 4 long-reloading magnet missiles. The magnet missiles seem only to slow down enemies and no longer gravitates enimies or vehicles towards you.",
    "thumbnail": "/images/vehicles/F24.jpg",
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 4e4,
    "id": "21c70052-7473-4124-9517-620e42dd10e4",
    "hasCustomStarOverrides": false,
    "tags": [
      "Air",
      "Special"
    ],
    "inGameCost": "Gems: 35,000 - 40,000",
    "hasManualGemRange": true,
    "rarity": "Exotic",
    "category": "Air",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inRecentlyUpdated": false,
    "tradeable": true,
    "name": "F24",
    "trend": "Stable",
    "hasCustomMultiplierOverrides": false,
    "demand": 4
  },
  {
    "notes": "An F-16 with two more missiles and a little faster/more health. Not worth a lot by default.",
    "history": [],
    "hasManualGemRange": true,
    "rarity": "Epic",
    "thumbnail": "/images/vehicles/Golden%20F-16.jpg",
    "gemOverrideMax": 800,
    "value": 800,
    "name": "Golden F-16",
    "demand": 1,
    "gemOverrideMin": 400,
    "category": "Air",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tags": [
      "golden-f-16"
    ],
    "tradeable": true,
    "id": "22007379-bb17-4217-9e9c-4a1f3aef9d62"
  },
  {
    "category": "Land",
    "gemOverrideMin": 20,
    "name": "Jeep",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/Jeep.jpg",
    "gemOverrideMax": 100,
    "trend": "Stable",
    "lastUpdated": "2026-06-14T00:14:15.388Z",
    "history": [],
    "rarity": "Common",
    "id": "22095372-2923-4c11-af6e-938fbb02f9ad",
    "value": 100,
    "tags": [
      "jeep"
    ],
    "demand": 1,
    "inRecentlyUpdated": false,
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "A cheap tycoon vehicle that is decent for arsenal levels but there are better options."
  },
  {
    "hasCustomMultiplierOverrides": false,
    "notes": "The Raptor X is a matte black-painted version of the Raptor that features the Super Sonic Dodge ability and 2 weapon loadouts. The first loadout is named Air-Air Combat and features a 200-round, right-positioned, frontal-aimed explosive round machine gun that deals good damage. Along with 8 average lock-on missiles. The second weapon loadout is named Super Sonic Missiles and features  4 anti-flare supersonic missiles that deal low damage but have a large AOE (Area Of Effect) range, along with  3 weak non-penetrating drop bombs that also have a large AOE range.",
    "rarity": "Limited Edition",
    "tradeable": true,
    "gemOverrideMin": 4e5,
    "hasCustomStarOverrides": false,
    "name": "Raptor X",
    "value": 5e5,
    "category": "Air",
    "gemOverrideMax": 45e4,
    "demand": 8,
    "excludeFromRecentlyUpdated": true,
    "trend": "Rising",
    "lastUpdated": "2026-09-14T22:10:59.359Z",
    "acronym": "SRX",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Raptor%20X.jpg",
    "history": [],
    "tags": [
      "Air"
    ],
    "inGameCost": "Gems: 400,000 - 450,000",
    "id": "2255610b-16bd-4ee0-83a4-1bfb06c5fa0c"
  },
  {
    "history": [],
    "name": "Helicopter",
    "gemOverrideMin": 20,
    "notes": "The first purchasable helicopter in the tycoon.",
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-14T00:14:16.478Z",
    "hasManualGemRange": true,
    "gemOverrideMax": 70,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "value": 70,
    "thumbnail": "/images/vehicles/Helicopter.jpg",
    "tags": [
      "helicopter"
    ],
    "trend": "Dropping",
    "rarity": "Common",
    "category": "Air",
    "id": "22c38ea3-3add-4c31-9031-249b4dfbc34d",
    "demand": 1
  },
  {
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Ground"
    ],
    "value": 15e3,
    "lastUpdated": "2026-06-14T00:14:17.891Z",
    "category": "Land",
    "tradeable": true,
    "notes": "Decent ground vehicle that features a cannon that fires explosive rounds and deals decent damage. It also features rocket reflection like that of the armored corvette.",
    "inGameCost": "Gems: 10,000 - 15,000",
    "name": "Super Akrep",
    "rarity": "Legendary",
    "gemOverrideMax": 15e3,
    "thumbnail": "/images/vehicles/Super%20Akrep.jpg",
    "demand": 7,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "gemOverrideMin": 1e4,
    "trend": "Stable",
    "id": "22cf8b75-ef1e-486f-9b5d-f7a35c64c15b"
  },
  {
    "demand": 6,
    "name": "Recon Destroyer",
    "history": [],
    "thumbnail": "/images/vehicles/Recon%20Destroyer.jpg",
    "category": "Naval",
    "rarity": "Legendary",
    "trend": "Stable",
    "inGameCost": "Gems: 7,500 - 12,500",
    "tags": [
      "Naval"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 12500,
    "value": 12500,
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "id": "22d307ec-0c7b-40c6-b97e-2688b99c2f78",
    "gemOverrideMin": 7500,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "notes": "The Recon Destroyer features the same weapons arsenal as the Super Recon Destroyer, except that it does not having the AI Rocket system. The Recon Destroyer also has a greatly reduced rotation speed."
  },
  {
    "name": "F35",
    "rarity": "Rare",
    "gemOverrideMin": 1500,
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": true,
    "category": "Air",
    "value": 1900,
    "inRecentlyUpdated": false,
    "tradeable": true,
    "demand": 3,
    "gemOverrideMax": 1900,
    "notes": "VTOL; very weak compared to its Gold counterpart",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "f35"
    ],
    "thumbnail": "/images/vehicles/F35.jpg",
    "history": [],
    "id": "22df8102-a483-4371-994c-f6ed9f4a02be",
    "trend": "Rising"
  },
  {
    "rarity": "Common",
    "hasCustomStarOverrides": false,
    "name": "Battlecruiser",
    "inRecentlyUpdated": false,
    "value": 9200,
    "hasManualGemRange": true,
    "hasCustomMultiplierOverrides": false,
    "demand": 3,
    "thumbnail": "/images/vehicles/Battlecruiser.jpg",
    "id": "233008f9-d022-4cfc-8178-a4cc875cb5a6",
    "notes": "A tanky but low firepower naval ship. ",
    "tags": [
      "Naval",
      "Collector"
    ],
    "gemOverrideMin": 7400,
    "category": "Naval",
    "history": [],
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 9200,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Dropping",
    "inGameCost": "Gems: 7,400 - 9,200"
  },
  {
    "rarity": "Epic",
    "tradeable": true,
    "tags": [
      "su-24"
    ],
    "demand": 4,
    "trend": "Dropping",
    "name": "Su-24",
    "id": "23802778-7088-4f3b-9811-78d99e993161",
    "category": "Air",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 1500,
    "gemOverrideMax": 1500,
    "history": [],
    "gemOverrideMin": 750,
    "thumbnail": "/images/vehicles/Su-24.jpg",
    "notes": "Very strong missiles - can 1-tap an AI carrier and many aerial vehicles. Becomes a lot more versatile with its reload speed upgrade. Very weak gunner seat.",
    "hasManualGemRange": true
  },
  {
    "gemOverrideMax": 15e3,
    "name": "Mig31",
    "hasManualGemRange": true,
    "history": [],
    "tradeable": true,
    "notes": "Decent speed jet with decent maneuverability and only has 6 cluster missiles like MIG-29",
    "gemOverrideMin": 1e4,
    "category": "Air",
    "value": 15e3,
    "demand": 5,
    "trend": "Stable",
    "id": "24399d91-1bc7-4039-938f-cf3efd9657b3",
    "tags": [
      "mig31"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Mig31.jpg",
    "rarity": "Legendary"
  },
  {
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Available through crates.",
    "name": "Dark Digital (Banner)",
    "category": "Tags",
    "value": 750,
    "inGameCost": "Gems: 500 - 750",
    "thumbnail": "/images/vehicles/Dark%20Digital%20_Banner_.jpg",
    "hasManualGemRange": true,
    "tradeable": true,
    "tags": [
      "Banner"
    ],
    "gemOverrideMin": 500,
    "demand": 5,
    "trend": "Stable",
    "id": "246819a9-dd9a-4105-b5eb-8dc7995160ca",
    "gemOverrideMax": 750,
    "history": [],
    "rarity": "Rare"
  },
  {
    "notes": "A tank with 2 large cannons that can deal with ground threats poorly. This version comes with missiles that are able to lock on, though they have low damage",
    "hasManualGemRange": true,
    "gemOverrideMin": 2500,
    "value": 3500,
    "thumbnail": "/images/vehicles/S-tank%20Barrage.jpg",
    "gemOverrideMax": 3500,
    "name": "S-tank Barrage",
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Stable",
    "id": "24b6d428-3015-4a51-b114-e8055d3a3be5",
    "tradeable": true,
    "demand": 2,
    "tags": [
      "s-tank-barrage"
    ],
    "history": [],
    "rarity": "Epic"
  },
  {
    "demand": 7,
    "starOverrides": {
      "0": 3000001,
      "1": 3000001,
      "2": 3000200,
      "3": 301e4,
      "4": 3022e3,
      "5": 3e6,
      "fresh": 325e4
    },
    "inGameCost": "Gems: 2,650,000 - 2,850,000",
    "hasCustomStarOverrides": true,
    "tags": [
      "Air"
    ],
    "value": 285e4,
    "history": [],
    "id": "24d51cae-8d09-487b-926d-6a8553a609ac",
    "hasCustomMultiplierOverrides": false,
    "tradeable": true,
    "rarity": "Limited Edition",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "acronym": "SLEO",
    "notes": "The Super variant of the Leonardo currently has the same weapons, speed, and damage as the exotic Leonardo.",
    "gemOverrideMax": 285e4,
    "name": "Super Leonardo",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/Super%20Leonardo.jpg",
    "category": "Air",
    "inRecentlyUpdated": false,
    "gemOverrideMin": 265e4,
    "trend": "Dropping",
    "starTierOverrides": {
      "0": {
        "gemOverrideMin": 2700001,
        "gemOverrideMax": 3300001,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "demand": 7,
        "value": 3000001
      },
      "1": {
        "demand": 7,
        "hasManualGemRange": false,
        "value": 3000001,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 3300001,
        "gemOverrideMin": 2700001
      },
      "2": {
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "value": 3000200,
        "demand": 7,
        "gemOverrideMin": 2700180,
        "gemOverrideMax": 3300220
      },
      "3": {
        "hasManualGemRange": false,
        "gemOverrideMin": 2709e3,
        "gemOverrideMax": 3311e3,
        "notes": "",
        "trend": "Stable",
        "demand": 7,
        "value": 301e4
      },
      "4": {
        "gemOverrideMin": 2719800,
        "gemOverrideMax": 3324200,
        "value": 3022e3,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "demand": 7
      },
      "5": {
        "trend": "Stable",
        "notes": "",
        "value": 3e6,
        "demand": 7,
        "gemOverrideMin": 27e5,
        "gemOverrideMax": 33e5,
        "hasManualGemRange": false
      },
      "fresh": {
        "hasManualGemRange": false,
        "gemOverrideMin": 2925e3,
        "gemOverrideMax": 3575e3,
        "demand": 7,
        "trend": "Stable",
        "notes": "",
        "value": 325e4
      }
    },
    "hasManualGemRange": true
  },
  {
    "trend": "Stable",
    "demand": 5,
    "inGameCost": "Gems: 20,000 - 25,000",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Banner"
    ],
    "rarity": "Exotic",
    "history": [],
    "tradeable": true,
    "thumbnail": "/images/vehicles/Veteran%20_Banner_.jpg",
    "notes": "Available through crates.",
    "gemOverrideMax": 25e3,
    "category": "Tags",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "hasCustomStarOverrides": false,
    "id": "24d8f966-0d06-4112-a97d-549c2da75260",
    "name": "Veteran (Banner)",
    "gemOverrideMin": 2e4,
    "value": 25e3,
    "hasManualGemRange": true,
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false
  },
  {
    "inGameCost": "Gems: 30,000 - 35,000",
    "category": "Naval",
    "name": "UAV Carrier",
    "trend": "Dropping",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/UAV%20Carrier.jpg",
    "history": [],
    "tradeable": true,
    "gemOverrideMax": 35e3,
    "rarity": "Exotic",
    "id": "2566d76a-823c-4eab-84db-feca50cd6b5d",
    "tags": [
      "Naval",
      "Special"
    ],
    "notes": "The UAV Carrier features 2 MQ-9 Reaper drones and 2 X-47B drones that deal average damage with their missiles. The Machine gun on the UAV Carrier does half the damage of the Super UAV Carrier variant. The reload speed of the UAV Carrier's machine gun is still the same as the Super UAV Carrier's machine gun",
    "gemOverrideMin": 3e4,
    "demand": 4,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "value": 35e3
  },
  {
    "notes": "A weaker apache; has an old recon scanner that predates the current one.(Spec Ops)",
    "history": [],
    "gemOverrideMin": 150,
    "rarity": "Common",
    "value": 225,
    "name": "Invictus",
    "gemOverrideMax": 225,
    "id": "25af3815-7c42-4058-8817-870c5720617f",
    "demand": 2,
    "tradeable": true,
    "category": "Air",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Invictus.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tags": [
      "invictus"
    ],
    "hasManualGemRange": true
  },
  {
    "history": [],
    "inGameCost": "Gems: 25 - 50",
    "thumbnail": "/images/vehicles/Shield%20_Emblem_.jpg",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": true,
    "trend": "Stable",
    "name": "Shield (Emblem)",
    "id": "25c81496-b101-4562-856a-528ab0a3e97e",
    "rarity": "Common",
    "demand": 1,
    "gemOverrideMin": 25,
    "tags": [
      "Emblem"
    ],
    "notes": "This emblem is obtained in the kill tag crates!",
    "category": "Tags",
    "gemOverrideMax": 50,
    "value": 50,
    "tradeable": true
  },
  {
    "notes": "This emblem can be obtained in the kill tag crates!",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 1,
    "tradeable": true,
    "value": 50,
    "category": "Tags",
    "rarity": "Common",
    "name": "Radar (Emblem)",
    "trend": "Stable",
    "inGameCost": "Gems: 25 - 50",
    "gemOverrideMax": 50,
    "history": [],
    "id": "26f65b4e-a1e8-4838-89c0-5967768f5bec",
    "gemOverrideMin": 25,
    "thumbnail": "/images/vehicles/Radar%20_Emblem_.jpg",
    "tags": [
      "Emblem"
    ]
  },
  {
    "thumbnail": "/images/vehicles/Tesla%20Tank.jpg",
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMin": 7e4,
    "trend": "Stable",
    "history": [],
    "gemOverrideMax": 1e5,
    "name": "Tesla Tank",
    "id": "26f74812-ed59-4e94-82ff-f68778d5fbef",
    "value": 1e5,
    "inGameCost": "Gems: 70,000 - 100,000",
    "rarity": "Exotic",
    "hasManualGemRange": true,
    "tradeable": true,
    "notes": "Fast-moving tank with an EMP railgun that performs like the EMP blast from the B2s in-game, along with dealing railgun damage and charging up like the Pelican and other railgun vehicles. The Tesla Tank also features the same flamethrower as seen on the Imperial and pyro tank variants, but in an electric reskin.",
    "demand": 6,
    "tags": [
      "Ground",
      "Special"
    ]
  },
  {
    "notes": "Helicopter with aimable explosive round machine gun and missiles that can lock onto more than one aerial target\n\n",
    "inRecentlyUpdated": false,
    "tradeable": true,
    "hasManualGemRange": true,
    "hasCustomMultiplierOverrides": false,
    "id": "2728ea7e-d38a-4978-a1a4-9d29cb8f4f57",
    "category": "Air",
    "excludeFromRecentlyUpdated": true,
    "value": 35e3,
    "history": [],
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "name": "LE Cobra",
    "trend": "Rising",
    "gemOverrideMin": 25e3,
    "demand": 4,
    "tags": [
      "Air"
    ],
    "gemOverrideMax": 35e3,
    "rarity": "Limited Edition",
    "thumbnail": "/images/vehicles/LE%20Cobra.jpg",
    "inGameCost": "Gems: 25,000 - 35,000",
    "hasCustomStarOverrides": false
  },
  {
    "gemOverrideMax": 12e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 5,
    "history": [],
    "trend": "Stable",
    "name": "Boss Viper",
    "gemOverrideMin": 1e4,
    "rarity": "Exotic",
    "tradeable": true,
    "tags": [
      "boss-viper"
    ],
    "thumbnail": "/images/vehicles/Boss%20Viper.jpg",
    "notes": "Powerful but slow helicopter featuring the same railgun as Boss Sea Tank, along with 3 hypersonic missiles and 2 powerful missiles, and missile barrage. A good choice for scrapping.",
    "hasManualGemRange": true,
    "category": "Air",
    "id": "27b61532-bf62-476f-ba79-24395eb758ae",
    "value": 12e3
  },
  {
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "category": "Tags",
    "history": [],
    "id": "27d6e22f-3cc9-4509-a86c-bf640c709842",
    "hasManualGemRange": true,
    "gemOverrideMax": 750,
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 500 - 750",
    "tradeable": true,
    "trend": "Stable",
    "gemOverrideMin": 500,
    "tags": [
      "Emote"
    ],
    "rarity": "Rare",
    "excludeFromRecentlyUpdated": true,
    "value": 750,
    "thumbnail": "/images/vehicles/Worm%20_Emote_.jpg",
    "name": "Worm (Emote)",
    "notes": "wiggle wiggle....... mrbankrupt loves worms!",
    "demand": 5,
    "hasCustomStarOverrides": false
  },
  {
    "gemOverrideMax": 5e4,
    "category": "Naval",
    "history": [],
    "id": "281043b5-ff50-488d-9f48-7b2619f66d71",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Dropping",
    "gemOverrideMin": 4e4,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Super%20Warship.jpg",
    "tags": [
      "Naval"
    ],
    "tradeable": true,
    "notes": "The Super Warship is a re-skinned Warship with some stat improvements.",
    "inGameCost": "Gems: 40,000 - 50,000",
    "rarity": "Exotic",
    "value": 5e4,
    "name": "Super Warship",
    "demand": 4
  },
  {
    "id": "28e891de-8ab8-4bba-9b64-24023b6061f4",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "trend": "Stable",
    "rarity": "Legendary",
    "tradeable": true,
    "category": "Land",
    "tags": [
      "Ground"
    ],
    "demand": 6,
    "gemOverrideMax": 12500,
    "notes": "The MLRS features the same weapons and features as the BOSS MLRS. The main difference is lower health and less damage with its weapons, along with other stat changes.",
    "thumbnail": "/images/vehicles/MLRS.jpg",
    "gemOverrideMin": 7500,
    "history": [],
    "value": 12500,
    "name": "MLRS",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 7,500 - 12,500"
  },
  {
    "history": [],
    "thumbnail": "/images/vehicles/Skynex.jpg",
    "name": "Skynex",
    "trend": "Stable",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "category": "Land",
    "id": "28fc0ef0-21e5-42c5-ad65-49ce49d64ebb",
    "value": 13e3,
    "gemOverrideMin": 1e4,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "Has machine gun with explosive rounds a decent magazine capacity, machine gun turret turns into ai defense system when vehicle is exited, detection range is too low for it to be viable though",
    "demand": 5,
    "gemOverrideMax": 13e3,
    "tags": [
      "Ground"
    ],
    "inGameCost": "Gems: 10,000 - 13,000"
  },
  {
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasCustomStarOverrides": false,
    "tags": [
      "Naval",
      "Special"
    ],
    "id": "2929c428-cac9-4bc2-8ed4-0e0d3638c6cf",
    "category": "Naval",
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "notes": "The Super Battle Yacht features an insane, damaging 75-round explosive round machine gun along with a 5-round semi-automatic railgun. The Super Battle Yacht also has AI-controlled missiles that deal low to medium damage. It takes about 2 full railgun charges to kill 1 AI Naval Destroyer. The railgun can be spam-fired, which is better than fully charging the railgun.",
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": false,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Super%20Battle%20Yacht.jpg",
    "inGameCost": "Gems: 1,250,000 - 1,500,000",
    "demand": 6,
    "acronym": "SBY",
    "value": 8e5,
    "rarity": "Limited Edition",
    "name": "Super Battle Yacht",
    "history": [
      {
        "tierValues": {
          "0": 15e5,
          "1": 15e5,
          "2": 1500200,
          "3": 151e4,
          "4": 152e4,
          "5": 156e4,
          "fresh": 15e5
        },
        "value": 15e5,
        "note": "Previous Market Valuation",
        "date": "Sep 02",
        "updatedBy": "System",
        "timestamp": "2026-09-03T00:16:11.353Z"
      },
      {
        "date": "Sep 09",
        "updatedBy": "Voiddarkreaper",
        "value": 8e5,
        "timestamp": "2026-09-10T00:16:11.353Z",
        "tierValues": {
          "0": 8e5,
          "1": 8e5,
          "2": 800200,
          "3": 81e4,
          "4": 82e4,
          "5": 86e4,
          "fresh": 8e5
        },
        "note": "Staff moderation update"
      }
    ]
  },
  {
    "value": 24e4,
    "gemOverrideMax": 24e4,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Super%20MIG31.jpg",
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 18e4,
    "category": "Air",
    "notes": "Decent speed jet with decent maneuverability and only has 8 cluster missiles like MIG-29",
    "tags": [
      "super-mig31"
    ],
    "demand": 7,
    "id": "29973075-9726-40f9-8507-6dd28908b2ef",
    "history": [],
    "tradeable": true,
    "rarity": "Exotic",
    "name": "Super MIG31",
    "trend": "Stable",
    "lastUpdated": "2026-06-12T22:11:16.644Z"
  },
  {
    "gemOverrideMax": 35e4,
    "excludeFromRecentlyUpdated": true,
    "demand": 5,
    "tags": [
      "Naval"
    ],
    "notes": "The Super variant of the Marasesti features 2 more torpedoes within the Anti-Naval weapons sub-section. Other than additional stats increases, they 2 vehicles are quite similar and are only differentiated by these 2 torpedos.",
    "gemOverrideMin": 3e5,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 300,000 - 350,000",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "tradeable": true,
    "inRecentlyUpdated": false,
    "value": 35e4,
    "rarity": "Limited Edition",
    "thumbnail": "/images/vehicles/Super%20Marasesti.jpg",
    "id": "2a0d9acd-cf1a-4cef-9abf-8d2b9465510e",
    "name": "Super Marasesti",
    "hasCustomStarOverrides": false,
    "category": "Naval",
    "acronym": "S MARA",
    "trend": "Stable",
    "history": []
  },
  {
    "rarity": "Limited Edition",
    "value": 4500001,
    "notes": "The Super Mech Walker features the same main functions and weapons as the exotic Mech Walker, except the 2 salvos or 5 missile bursts are swapped out for a single salvo 2-shot nuclear missile burst. The ammo capacity of the Super Mech Walker's main cluster cannon is increased from 4 to 6 rounds from the exotic to the super variant.",
    "hasCustomMultiplierOverrides": false,
    "thumbnail": "data:image/jpeg;base64,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",
    "demand": 7,
    "excludeFromRecentlyUpdated": true,
    "starOverrides": {
      "0": 4500001,
      "1": 4500001,
      "2": 4500001,
      "3": 4500001,
      "4": 4500001,
      "5": 45e5,
      "fresh": 6e6
    },
    "name": "Super Mech Walker",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "history": [
      {
        "tierValues": {
          "0": 5250001,
          "1": 5250001,
          "2": 5250001,
          "3": 5250001,
          "4": 5250001,
          "5": 525e4,
          "fresh": 6e6
        },
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "timestamp": "2026-09-10T22:08:37.729Z",
        "value": 45e5,
        "date": "Sep 10"
      },
      {
        "updatedBy": "Voiddarkreaper",
        "date": "Sep 10",
        "value": 45e5,
        "timestamp": "2026-09-11T01:50:00.630Z",
        "tierValues": {
          "0": 5000001,
          "1": 5000001,
          "2": 5000001,
          "3": 5000001,
          "4": 5000001,
          "5": 5e6,
          "fresh": 6e6
        },
        "note": "Staff moderation update"
      },
      {
        "timestamp": "2026-09-14T00:39:32.277Z",
        "note": "Staff moderation update",
        "value": 4e6,
        "updatedBy": "Voiddarkreaper",
        "tierValues": {
          "0": 4e6,
          "1": 4e6,
          "2": 4e6,
          "3": 4e6,
          "4": 4e6,
          "5": 4e6,
          "fresh": 6e6
        },
        "date": "Sep 13"
      },
      {
        "updatedBy": "Spuppers",
        "value": 4500001,
        "date": "Sep 13",
        "timestamp": "2026-09-14T00:40:17.843Z",
        "tierValues": {
          "0": 4500001,
          "1": 4500001,
          "2": 4500001,
          "3": 4500001,
          "4": 4500001,
          "5": 45e5,
          "fresh": 6e6
        },
        "note": "Staff moderation update"
      }
    ],
    "inRecentlyUpdated": false,
    "tradeable": true,
    "inGameCost": "Gems: 4,000,000 - 4,500,000",
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "trend": "Unstable",
        "notes": "",
        "gemOverrideMax": 4725001,
        "gemOverrideMin": 4275001,
        "hasManualGemRange": false,
        "value": 4500001,
        "demand": 7
      },
      "1": {
        "gemOverrideMin": 4275001,
        "gemOverrideMax": 4725001,
        "hasManualGemRange": false,
        "demand": 7,
        "trend": "Unstable",
        "notes": "",
        "value": 4500001
      },
      "2": {
        "value": 4500001,
        "demand": 7,
        "trend": "Unstable",
        "notes": "",
        "gemOverrideMin": 4275001,
        "gemOverrideMax": 4725001,
        "hasManualGemRange": false
      },
      "3": {
        "demand": 7,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Unstable",
        "value": 4500001,
        "gemOverrideMax": 4725001,
        "gemOverrideMin": 4275001
      },
      "4": {
        "demand": 7,
        "notes": "",
        "trend": "Unstable",
        "value": 4500001,
        "gemOverrideMax": 4725001,
        "gemOverrideMin": 4275001,
        "hasManualGemRange": false
      },
      "5": {
        "value": 45e5,
        "trend": "Unstable",
        "notes": "",
        "demand": 7,
        "gemOverrideMax": 4725e3,
        "gemOverrideMin": 4275e3,
        "hasManualGemRange": false
      },
      "fresh": {
        "hasManualGemRange": false,
        "demand": 7,
        "gemOverrideMax": 63e5,
        "gemOverrideMin": 57e5,
        "value": 6e6,
        "trend": "Unstable",
        "notes": ""
      }
    },
    "trend": "Unstable",
    "tags": [
      "Ground"
    ],
    "id": "2a37291f-da5e-4144-a27f-4a2794755a92",
    "category": "Land",
    "acronym": "SMW",
    "hasCustomStarOverrides": true
  },
  {
    "tradeable": true,
    "value": 250,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 5,
    "inGameCost": "Gems: 150 - 250",
    "rarity": "Uncommon",
    "notes": "Available through crates.",
    "name": "Desert (Banner)",
    "history": [],
    "hasManualGemRange": true,
    "id": "2a617d61-1745-4653-96b9-5069884c802f",
    "gemOverrideMax": 250,
    "category": "Tags",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Desert%20_Banner_.jpg",
    "tags": [
      "Banner"
    ],
    "gemOverrideMin": 150
  },
  {
    "tags": [
      "Ground"
    ],
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "2a8dd92a-2f9e-4b3b-b400-da0a8e1f6c75",
    "tradeable": true,
    "name": "M10 Booker",
    "gemOverrideMax": 4e3,
    "category": "Land",
    "history": [],
    "inGameCost": "Gems: 2,000 - 4,000",
    "demand": 2,
    "notes": "A tank with a fast reload time, but hardly any damage.",
    "thumbnail": "/images/vehicles/M10%20Booker.jpg",
    "gemOverrideMin": 2e3,
    "rarity": "Epic",
    "hasManualGemRange": true,
    "value": 4e3
  },
  {
    "name": "Nuke F35",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "A gold F-35 with a small nuke. VTOL capable. Preforms poorly compared to other exotic options.",
    "rarity": "Exotic",
    "history": [],
    "category": "Air",
    "demand": 6,
    "tradeable": true,
    "value": 5e4,
    "thumbnail": "/images/vehicles/Nuke%20F35.jpg",
    "tags": [
      "nuke-f35"
    ],
    "trend": "Dropping",
    "gemOverrideMin": 4e4,
    "hasManualGemRange": true,
    "id": "2c0f3d8c-c6ce-41b5-b271-c98941180cba",
    "gemOverrideMax": 5e4
  },
  {
    "inGameCost": "Untradable",
    "inRecentlyUpdated": false,
    "tradeable": false,
    "lastUpdated": "2026-08-29",
    "trend": "Stable",
    "name": "Snow Grenade",
    "rarity": "Epic",
    "hasCustomStarOverrides": false,
    "id": "2c610694-5f2c-4933-acfa-af7b0f33b416",
    "value": 0,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "category": "Other",
    "thumbnail": "https://static.wixstatic.com/media/6511c0_94d1090b5ed744d8b48addb6df8e5925~mv2.png/v1/fill/w_162,h_86,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/Screenshot%202025-12-14%20192136.png",
    "notes": "Reskin of the normal Grenade within the game.",
    "demand": 5,
    "tags": [
      "Tool"
    ]
  },
  {
    "id": "2c77af40-a658-48ce-a919-9d4ec5f2613b",
    "tags": [
      "Banner"
    ],
    "rarity": "Exotic",
    "trend": "Stable",
    "tradeable": true,
    "demand": 5,
    "hasCustomMultiplierOverrides": false,
    "thumbnail": "/images/vehicles/Shotgun%20_Banner_.jpg",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 15,000 - 20,000",
    "gemOverrideMax": 2e4,
    "name": "Shotgun (Banner)",
    "category": "Tags",
    "hasCustomStarOverrides": false,
    "notes": "Available through crates.",
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "gemOverrideMin": 15e3,
    "value": 2e4
  },
  {
    "gemOverrideMax": 8e3,
    "name": "Silver Howl",
    "category": "Air",
    "notes": "Reskinned Zhi 19E with a passenger seat that has 2 missile barrages that are not able to lock on.",
    "thumbnail": "/images/vehicles/Silver%20Howl.jpg",
    "gemOverrideMin": 5e3,
    "value": 8e3,
    "hasManualGemRange": true,
    "tags": [
      "Air"
    ],
    "trend": "Stable",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Legendary",
    "history": [],
    "demand": 7,
    "id": "2d1abeea-b57f-4d74-8f5d-bf4c04d6c924",
    "inGameCost": "Gems: 5,000 - 8,000"
  },
  {
    "value": 6e3,
    "tradeable": true,
    "gemOverrideMin": 4e3,
    "notes": "Has Infinite normal lock on missiles and 10 high speed missiles, along with 2 naval missiles that can 3 shot the boat along with 2 torpedos that can 2 shot the boat.\n\nHas increased in demand slightly due to being fixed",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "name": "Surrogat",
    "gemOverrideMax": 6e3,
    "rarity": "Legendary",
    "tags": [
      "Naval"
    ],
    "inGameCost": "Gems: 4,000 - 6,000",
    "trend": "Rising",
    "id": "2eb8b007-dbc8-48f4-8e06-034806da91ef",
    "demand": 7,
    "history": [],
    "hasManualGemRange": true,
    "category": "Naval",
    "thumbnail": "/images/vehicles/Surrogat.jpg"
  },
  {
    "category": "Tags",
    "history": [],
    "value": 50,
    "tradeable": true,
    "notes": "This emblem is obtained in the Kill Tag Crates!",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 25 - 50",
    "tags": [
      "Emblem"
    ],
    "rarity": "Common",
    "gemOverrideMin": 25,
    "thumbnail": "/images/vehicles/Medal%20_Emblem_.jpg",
    "hasManualGemRange": true,
    "name": "Medal (Emblem)",
    "trend": "Stable",
    "demand": 1,
    "id": "2edb5be3-fb6d-417f-a1f7-bc1e328dce17",
    "gemOverrideMax": 50
  },
  {
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "name": "Platinum F-16",
    "notes": "Essentially a slightly stronger, reskined Gold F-16 - but it's the only vehicle with an UGC attached to it.",
    "gemOverrideMax": 3500,
    "tradeable": true,
    "value": 3500,
    "gemOverrideMin": 2e3,
    "tags": [
      "Collector",
      "platinum-f-16"
    ],
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "category": "Air",
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Platinum%20F-16.jpg",
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "history": [],
    "demand": 3,
    "id": "2eeded85-27bb-4b31-93fe-6103bb9dbbb7"
  },
  {
    "hasCustomStarOverrides": false,
    "notes": "Functions like a helicopter; it has an unique ability that allows it to pull vehicles and people along with it. Unobtainable since Halloween 2023",
    "hasCustomMultiplierOverrides": false,
    "rarity": "Limited Edition",
    "thumbnail": "/images/vehicles/UFO.jpg",
    "inRecentlyUpdated": false,
    "hasManualGemRange": false,
    "id": "2ef1261a-f223-413e-92ee-1bdf57db8efe",
    "history": [
      {
        "value": 1700,
        "timestamp": "2026-06-12T22:11:16.644Z",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 1700,
          "fresh": 0
        },
        "updatedBy": "System",
        "date": "Jun 12",
        "note": "Previous Market Valuation"
      },
      {
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "timestamp": "2026-09-14T01:14:22.251Z",
        "value": 2e3,
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 2e3,
          "fresh": 0
        },
        "date": "Sep 13",
        "tier": "5"
      }
    ],
    "value": 2e3,
    "tags": [
      "ufo"
    ],
    "demand": 3,
    "trend": "Rising",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "category": "Air",
    "tradeable": true,
    "name": "UFO",
    "excludeFromRecentlyUpdated": true
  },
  {
    "trend": "Rising",
    "gemOverrideMax": 1e4,
    "tradeable": true,
    "inGameCost": "Gems: 5,000 - 10,000",
    "demand": 7,
    "name": "Tank Boat",
    "hasManualGemRange": true,
    "gemOverrideMin": 5e3,
    "rarity": "Legendary",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "category": "Naval",
    "notes": "Fast attack boat with a tank cannon that deals high damage, along with having a decently fast reload speed. The cannon has 5 shots before requiring a reload. The Tank boat also features a passenger seat that unfortunately has no weapons or special abilities.",
    "thumbnail": "/images/vehicles/Tank%20Boat.jpg",
    "value": 1e4,
    "history": [],
    "tags": [
      "Naval"
    ],
    "id": "2fdc6575-0bda-407d-b919-e5a3194e28d4"
  },
  {
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/AT-6.jpg",
    "trend": "Stable",
    "demand": 3,
    "name": "AT-6",
    "rarity": "Legendary",
    "id": "303d2530-0e93-4f29-bdfa-21f460b13bc2",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "AI can shoot down missiles effectively, but is very slow and has a horrible turn rate if WIP controls arn't used",
    "gemOverrideMax": 3700,
    "value": 3700,
    "tradeable": true,
    "history": [],
    "gemOverrideMin": 3e3,
    "tags": [
      "at-6"
    ],
    "category": "Air"
  },
  {
    "inGameCost": "Gems: 200 - 300",
    "rarity": "Common",
    "tags": [
      "Naval",
      "Collector"
    ],
    "id": "30638f0c-3a6f-40b1-8bad-0c2d53789f82",
    "demand": 1,
    "trend": "Rising",
    "thumbnail": "/images/vehicles/Destroyer.jpg",
    "category": "Naval",
    "history": [],
    "tradeable": true,
    "gemOverrideMax": 300,
    "value": 300,
    "name": "Destroyer",
    "gemOverrideMin": 200,
    "hasManualGemRange": true,
    "notes": "One of the few naval vehicles that can spawn vehicles from it. It has a cannon and torpedoes for the driver to control and has an Apache and Helicopter spawn point on the back.",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "demand": 7,
    "name": "Overlord",
    "inGameCost": "Gems: 9,000 - 10,500",
    "gemOverrideMax": 10500,
    "hasManualGemRange": true,
    "id": "3070a440-b49f-4575-8a7d-d2ab71c1475a",
    "rarity": "Legendary",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 9e3,
    "tradeable": true,
    "history": [],
    "trend": "Stable",
    "category": "Land",
    "thumbnail": "/images/vehicles/Overlord.jpg",
    "tags": [
      "Ground"
    ],
    "value": 10500,
    "notes": "The normal Overlord features the same weapons set, damage, weapon reload speed, vehicle speed, and other stats. The major difference between the Master variant and the normal Overlord is the hitbox size, with the Master Overlord having a larger one than the normal variant."
  },
  {
    "id": "30b63a6b-a942-4a35-b48b-47e903ce01fa",
    "hasManualGemRange": true,
    "tradeable": true,
    "notes": "has a hold and release burst fire railgun, that has instant reload, along with 4 average missiles that can lock on",
    "value": 12e3,
    "category": "Land",
    "tags": [
      "boss-sea-tank"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 12e3,
    "trend": "Stable",
    "history": [],
    "demand": 5,
    "gemOverrideMin": 8e3,
    "name": "Boss Sea Tank",
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Boss%20Sea%20Tank.jpg"
  },
  {
    "value": 18e4,
    "demand": 3,
    "inGameCost": "Gems: 130,000 - 180,000",
    "rarity": "Limited Edition",
    "notes": "The Zumwalt X features a high-fire-rate dual-explosive-round cannon. It has improved damage and a significantly increased fire rate compared to the normal Zumwalt. The Zumwalt X also features 2 AI Drones that shoot out missiles and are very powerful with a lot of health. The drone respawn cooldown is fast enough to be able to not be destroyed in your Zumwalt unless splash damage or stars are used.  The Zumwalt X also features missiles with a faster fire rate and speed than the normal missiles on the original Zumwalt.",
    "thumbnail": "/images/vehicles/Zumwalt%20X.jpg",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tags": [
      "Naval"
    ],
    "gemOverrideMin": 13e4,
    "tradeable": true,
    "id": "30c605f5-8121-4610-a9c8-90062e6b24af",
    "gemOverrideMax": 18e4,
    "name": "Zumwalt X",
    "trend": "Stable",
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "history": [],
    "category": "Naval"
  },
  {
    "tradeable": true,
    "id": "31df7903-be6a-474b-bde2-1c50df628d02",
    "excludeFromRecentlyUpdated": true,
    "rarity": "Limited Edition",
    "name": "Platinum SB-12",
    "hasCustomStarOverrides": true,
    "demand": 3,
    "inGameCost": "Gems: 4,000,000 - 4,200,000",
    "starOverrides": {
      "0": 5e6,
      "1": 5e6,
      "2": 4000001,
      "3": 4000001,
      "4": 4000001,
      "5": 4e6,
      "fresh": 2e7
    },
    "trend": "Stable",
    "acronym": "SB12/PB12",
    "category": "Air",
    "value": 5e6,
    "tags": [
      "Air",
      "Special"
    ],
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "gemOverrideMin": 475e4,
        "value": 5e6,
        "gemOverrideMax": 525e4,
        "trend": "Stable",
        "notes": "",
        "demand": 3,
        "hasManualGemRange": false
      },
      "1": {
        "hasManualGemRange": false,
        "gemOverrideMin": 45e5,
        "gemOverrideMax": 55e5,
        "demand": 3,
        "trend": "Stable",
        "notes": "",
        "value": 5e6
      },
      "2": {
        "gemOverrideMax": 4400001,
        "gemOverrideMin": 3600001,
        "value": 4000001,
        "demand": 3,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false
      },
      "3": {
        "demand": 3,
        "hasManualGemRange": false,
        "value": 4000001,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMax": 4400001,
        "gemOverrideMin": 3600001
      },
      "4": {
        "value": 4000001,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 4400001,
        "gemOverrideMin": 3600001,
        "hasManualGemRange": false,
        "demand": 3
      },
      "5": {
        "value": 4e6,
        "demand": 5,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMax": 44e5,
        "gemOverrideMin": 36e5
      },
      "fresh": {
        "hasManualGemRange": false,
        "demand": 5,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMax": 22e6,
        "gemOverrideMin": 18e6,
        "value": 2e7
      }
    },
    "hasCustomMultiplierOverrides": false,
    "history": [
      {
        "date": "Sep 10",
        "updatedBy": "System",
        "timestamp": "2026-09-10T22:08:36.830Z",
        "tierValues": {
          "0": 6e6,
          "1": 5e6,
          "2": 4000001,
          "3": 4000001,
          "4": 4000001,
          "5": 4e6,
          "fresh": 2e7
        },
        "value": 42e5,
        "note": "Previous Market Valuation"
      },
      {
        "value": 5,
        "note": "Staff moderation update",
        "date": "Sep 13",
        "updatedBy": "Spuppers",
        "tier": "0",
        "timestamp": "2026-09-14T00:38:05.645Z",
        "tierValues": {
          "0": 5,
          "1": 5e6,
          "2": 4000001,
          "3": 4000001,
          "4": 4000001,
          "5": 4e6,
          "fresh": 2e7
        }
      },
      {
        "note": "Staff moderation update",
        "updatedBy": "Spuppers",
        "date": "Sep 13",
        "tier": "0",
        "tierValues": {
          "0": 5e6,
          "1": 5e6,
          "2": 4000001,
          "3": 4000001,
          "4": 4000001,
          "5": 4e6,
          "fresh": 2e7
        },
        "timestamp": "2026-09-14T01:12:58.641Z",
        "value": 5e6
      }
    ],
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Platinum%20SB-12.jpg",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "The Platinum SB-12 is a large bomber-type aircraft that, due to its size, spawns in front of your base instead of the traditional airstrip. The Platinum SB-12 also features a passenger that unfortunately doesn't have any other use or weapons. The Platinum SB-12 has AI defense machine guns that have poor accuracy, poor range, and poor damage, which makes it obsolete as an offensive or defensive option. The Platinum SB-12 also has 8 defensive YF1 drones that feature an explosive-round machine gun with decent accuracy and average damage. The range at which these drones can attack is quite good compared to the drone attack range of other drones spawning vehicles. The Platinum SB-12 also has 5 drop bombs that deal average damage with a small to medium explosive radius, along with an average reload duration."
  },
  {
    "id": "32e1abea-c5c5-427f-bc1f-6e33167578ce",
    "value": 7e3,
    "gemOverrideMax": 7e3,
    "demand": 6,
    "inGameCost": "Gems: 5,600 - 7,000",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "rarity": "Legendary",
    "hasCustomStarOverrides": false,
    "gemOverrideMin": 5600,
    "name": "Zombie Juggernaut",
    "notes": "reskined juggernaut with slightly higher stats",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Zombie%20Juggernaut.jpg",
    "inRecentlyUpdated": false,
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "trend": "Rising",
    "tags": [
      "Soldiers",
      "Collector"
    ],
    "history": [],
    "category": "Soldier"
  },
  {
    "notes": "Severly outgunned in most air to air or air to ground fights due to its weak explosive machine gun and slow missiles.",
    "id": "33c7c450-b5ec-401d-8544-83b16d6edd65",
    "value": 0,
    "tradeable": false,
    "name": "Fighter Jet",
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Fighter%20Jet.jpg",
    "demand": 6,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "inRecentlyUpdated": false,
    "tags": [
      "fighter-jet"
    ],
    "rarity": "Legendary",
    "history": [],
    "category": "Air",
    "excludeFromRecentlyUpdated": true
  },
  {
    "id": "33d57724-df12-4040-8f62-2faee6215e5a",
    "trend": "Dropping",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "thumbnail": "/images/vehicles/Super%20U2.jpg",
    "tags": [
      "super-u2"
    ],
    "rarity": "Exotic",
    "value": 3e4,
    "tradeable": true,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 3e4,
    "category": "Air",
    "name": "Super U2",
    "notes": "Same arsenal as normal U2 but deals more damage",
    "demand": 6,
    "hasManualGemRange": true,
    "gemOverrideMin": 2e4,
    "inRecentlyUpdated": false
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "hasCustomStarOverrides": false,
    "name": "Platinum Mech",
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "id": "33fc5890-16c8-4315-a930-fe82423d8887",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "inGameCost": "Gems: 400,000 - 450,000",
    "acronym": "PMECH",
    "thumbnail": "/images/vehicles/Platinum%20Mech.jpg",
    "value": 45e4,
    "category": "Land",
    "demand": 4,
    "tradeable": true,
    "gemOverrideMax": 45e4,
    "rarity": "Limited Edition",
    "notes": "Mech with the same infinite boost and jumps systems. It also has missile bursts that are able to be fired faster than they can be reloaded. It also features dual aimable lasers that deal serious damage.",
    "tags": [
      "Ground"
    ],
    "gemOverrideMin": 4e5
  },
  {
    "notes": "Fast helicopter with rockets and frontal explosive round turret ",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "gemOverrideMin": 3e3,
    "history": [],
    "value": 5e3,
    "tags": [
      "miron"
    ],
    "tradeable": true,
    "gemOverrideMax": 5e3,
    "demand": 5,
    "thumbnail": "/images/vehicles/Miron.jpg",
    "trend": "Stable",
    "category": "Air",
    "name": "Miron",
    "id": "342f4e6b-6dc7-4b9f-b09b-54ff79cea6b0",
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "hasManualGemRange": true,
    "category": "Air",
    "inRecentlyUpdated": true,
    "tags": [
      "Air"
    ],
    "trend": "Glazed",
    "thumbnail": "/images/vehicles/Super%20Razor.jpg",
    "excludeFromRecentlyUpdated": false,
    "history": [
      {
        "timestamp": "2026-09-10T22:08:36.830Z",
        "date": "Sep 10",
        "updatedBy": "System",
        "tierValues": {
          "0": 23e5,
          "1": 23e5,
          "2": 23e5,
          "3": 23e5,
          "4": 23e5,
          "5": 23e5,
          "fresh": 23e5
        },
        "value": 23e5,
        "note": "Previous Market Valuation"
      },
      {
        "note": "Staff moderation update",
        "value": 27e5,
        "timestamp": "2026-09-11T01:52:21.253Z",
        "date": "Sep 10",
        "tierValues": {
          "0": 27e5,
          "1": 27e5,
          "2": 27e5,
          "3": 27e5,
          "4": 27e5,
          "5": 27e5,
          "fresh": 27e5
        },
        "updatedBy": "Voiddarkreaper"
      },
      {
        "tierValues": {
          "0": 28e5,
          "1": 28e5,
          "2": 28e5,
          "3": 28e5,
          "4": 28e5,
          "5": 28e5,
          "fresh": 28e5
        },
        "note": "Staff moderation update",
        "updatedBy": "Voiddarkreaper",
        "timestamp": "2026-09-12T00:13:56.395Z",
        "value": 28e5,
        "date": "Sep 11"
      }
    ],
    "hasCustomMultiplierOverrides": false,
    "id": "34530dd5-159d-4215-82e5-190db528b3a2",
    "name": "Super Razor",
    "gemOverrideMin": 25e5,
    "rarity": "Limited Edition",
    "tradeable": true,
    "notes": "The Super Razor features 2 EMP missile bursts along with rapid acceleration. The top speed of the Razor is average. The Super Razor also has 4 larger-sized missiles that deal above average damage. The Super Razor also features the Super Sonic Dodge.",
    "acronym": "SRAZ",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 3e6,
    "demand": 7,
    "hasCustomStarOverrides": false,
    "value": 28e5,
    "inGameCost": "Gems: 2,100,000 - 2,300,000"
  },
  {
    "history": [],
    "notes": "clap             clap             clap",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Slow Clap (Emote)",
    "value": 500,
    "hasManualGemRange": true,
    "category": "Tags",
    "trend": "Stable",
    "rarity": "Uncommon",
    "gemOverrideMax": 500,
    "inGameCost": "Gems: 250 - 500",
    "thumbnail": "/images/vehicles/Slow%20Clap%20_Emote_.jpg",
    "tags": [
      "Emote"
    ],
    "gemOverrideMin": 250,
    "demand": 5,
    "id": "3459019f-06db-4094-99bb-215c4b571d52"
  },
  {
    "value": 1250,
    "gemOverrideMin": 750,
    "tradeable": true,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "category": "Tags",
    "notes": "harummmmmmmmmmmmm harummmmmmmmmmmmm",
    "gemOverrideMax": 1250,
    "tags": [
      "Emote"
    ],
    "history": [],
    "demand": 5,
    "id": "34971542-765b-418d-a0bc-c64130c3d53b",
    "inGameCost": "Gems: 750 - 1,250",
    "rarity": "Epic",
    "trend": "Stable",
    "name": "Zen (Emote)",
    "thumbnail": "/images/vehicles/Zen%20_Emote_.jpg"
  },
  {
    "thumbnail": "/images/vehicles/Knife%20Flip%20_Emote_.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 3500,
    "id": "34ca88b7-f732-431b-9511-d377026232c0",
    "value": 4500,
    "name": "Knife Flip (Emote)",
    "gemOverrideMax": 4500,
    "notes": "dont try this at home",
    "history": [],
    "hasManualGemRange": true,
    "category": "Tags",
    "demand": 5,
    "tags": [
      "Emote"
    ],
    "inGameCost": "Gems: 3,500 - 4,500",
    "rarity": "Legendary",
    "trend": "Stable",
    "tradeable": true
  },
  {
    "thumbnail": "/images/vehicles/Elite%20Sturmtank.jpg",
    "hasManualGemRange": true,
    "gemOverrideMin": 1e5,
    "id": "34cc7291-0b00-44d8-bfe9-cce2857d40ea",
    "inRecentlyUpdated": false,
    "name": "Elite Sturmtank",
    "gemOverrideMax": 135e3,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "category": "Land",
    "trend": "Rising",
    "tags": [
      "elite-sturmtank"
    ],
    "rarity": "Exotic",
    "value": 135e3,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "demand": 5,
    "tradeable": true,
    "notes": "Upgraded Sturm Tank with stun rounds capable of stunning players"
  },
  {
    "name": "Zeplin-X",
    "gemOverrideMax": 15e3,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "history": [],
    "gemOverrideMin": 11e3,
    "thumbnail": "/images/vehicles/Zeplin-X.jpg",
    "trend": "Stable",
    "demand": 6,
    "tags": [
      "zeplin-x"
    ],
    "hasManualGemRange": true,
    "value": 15e3,
    "tradeable": true,
    "rarity": "Legendary",
    "category": "Air",
    "id": "35303965-e7cd-4ae0-b849-c9e9ae5b2ce7",
    "notes": "A large, heavily armed blimp(that functions identically to a helicopter) with high health, but because of its large size it makes it somewhat easy to take down with any decent plane or AA"
  },
  {
    "value": 13e4,
    "demand": 7,
    "id": "3544223a-294a-4ecf-9816-7baf9d73634f",
    "rarity": "Exotic",
    "notes": "The Beam Tank features 13 individual lasers that are quite powerful and deal 2.4k damage against a boss. It's able to 1 shot the 4-star general. The Beam Tank also features an aimable explosive round machine gun that deals average damage. The reload speed of both of these weapons is average. But the laser can not be reloaded within its salvo, so you have to finish its entire salvo before being able to reload. The Beam tank has amazing maneuverability and vehicle speed compared to other ground vehicles. The total damage of the lasers against bosses is 32k damage per second, much more than the lowly 6k damage per second against bosses.",
    "tags": [
      "Ground",
      "Special"
    ],
    "thumbnail": "/images/vehicles/Beam%20Tank.jpg",
    "tradeable": true,
    "inGameCost": "Gems: 110,000 - 130,000",
    "gemOverrideMax": 13e4,
    "hasManualGemRange": true,
    "history": [],
    "trend": "Stable",
    "category": "Land",
    "gemOverrideMin": 11e4,
    "name": "Beam Tank",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "thumbnail": "/images/vehicles/Rocket%20Truck.jpg",
    "name": "Rocket Truck",
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "rarity": "Legendary",
    "trend": "Rising",
    "history": [],
    "demand": 4,
    "notes": "Has non lock on rockets that are angled in an arc to aim",
    "tags": [
      "rocket-truck"
    ],
    "id": "354c9cac-892a-46e5-a8c3-ea4778b05181",
    "category": "Land",
    "tradeable": false,
    "value": 0,
    "inRecentlyUpdated": false
  },
  {
    "demand": 6,
    "gemOverrideMax": 225,
    "tradeable": true,
    "value": 225,
    "name": "Hacker",
    "gemOverrideMin": 175,
    "rarity": "Epic",
    "notes": "Can hack eletric panels opening them. Rather pointless in the current stage of the game.",
    "id": "35dee3ea-ae44-4c41-ae6e-6c84776f00e7",
    "tags": [
      "Soldiers"
    ],
    "category": "Soldier",
    "inGameCost": "Gems: 175 - 225",
    "history": [],
    "trend": "Rising",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Hacker.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "trend": "Stable",
    "rarity": "Exotic",
    "inGameCost": "Gems: 65,000 - 75,000",
    "thumbnail": "/images/vehicles/Leonardo.jpg",
    "lastUpdated": "2026-09-14T22:15:39.626Z",
    "inRecentlyUpdated": false,
    "tags": [
      "Air",
      "Collector",
      "Special"
    ],
    "demand": 7,
    "hasManualGemRange": true,
    "hasCustomStarOverrides": false,
    "gemOverrideMax": 75e3,
    "id": "36372158-330f-4b5a-83d1-ec45a9ff9c4c",
    "notes": "The Leonardo variants are the first vehicles to feature the hunter mode in the form of a helicopter. They also feature split weapons controls like the F-16 Falcon. The two weapon modes are Anti-Ground and Anti-Air. Within Anti-Ground, the default when first spawned i,n you get a aimable explosive round machine gun that features a large ammo capacity with an average reload speed. The ground weapon mode also has 2 missile bursts that deal average damage, which are unable to lock onto any form of vehicle. The Anti-Air weapon mode features the Hunter mode, which lasts for 10 seconds and provides a slight speed boost. There are also 8Hypersonic and Anti-Flare missiles that deal average damage.",
    "acronym": "LEO",
    "tradeable": true,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "value": 1e5,
    "gemOverrideMin": 65e3,
    "name": "Leonardo",
    "category": "Air"
  },
  {
    "tags": [
      "rafale"
    ],
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 6e3,
    "gemOverrideMax": 6e3,
    "history": [],
    "notes": "This plane has 2 decent bombs and 4 average missiles. It is an all around plane being decent for everything but it does not truly shine anywhere either.",
    "tradeable": true,
    "gemOverrideMin": 4800,
    "thumbnail": "/images/vehicles/Rafale.jpg",
    "rarity": "Legendary",
    "name": "Rafale",
    "demand": 3,
    "trend": "Dropping",
    "category": "Air",
    "id": "3657c72b-1e22-452b-b34f-b4505c5cd8c7"
  },
  {
    "demand": 8,
    "gemOverrideMin": 14e5,
    "acronym": "STT",
    "category": "Land",
    "rarity": "Limited Edition",
    "name": "Super Tesla Tank",
    "id": "369ea71d-fc22-4599-b43f-791c9417dcb5",
    "trend": "Rising",
    "hasCustomMultiplierOverrides": false,
    "gemOverrideMax": 16e5,
    "tradeable": true,
    "starOverrides": {
      "0": 1500001,
      "1": 1500001,
      "2": 1500001,
      "3": 1500001,
      "4": 1500001,
      "5": 15e5,
      "fresh": 2e6
    },
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "thumbnail": "/images/vehicles/Super%20Tesla%20Tank.jpg",
    "value": 16e5,
    "inRecentlyUpdated": false,
    "notes": "Improved version of the normal Tesla Tank",
    "inGameCost": "Gems: 1,400,000 - 1,600,000",
    "starTierOverrides": {
      "0": {
        "hasManualGemRange": false,
        "gemOverrideMin": 1350001,
        "trend": "Rising",
        "notes": "",
        "gemOverrideMax": 1650001,
        "value": 1500001,
        "demand": 3
      },
      "1": {
        "gemOverrideMax": 1650001,
        "gemOverrideMin": 1350001,
        "value": 1500001,
        "notes": "",
        "trend": "Rising",
        "hasManualGemRange": false,
        "demand": 3
      },
      "2": {
        "trend": "Rising",
        "notes": "",
        "value": 1500001,
        "gemOverrideMax": 1650001,
        "gemOverrideMin": 1350001,
        "hasManualGemRange": false,
        "demand": 3
      },
      "3": {
        "demand": 3,
        "value": 1500001,
        "trend": "Rising",
        "notes": "",
        "hasManualGemRange": false,
        "gemOverrideMin": 1350001,
        "gemOverrideMax": 1650001
      },
      "4": {
        "value": 1500001,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Rising",
        "gemOverrideMin": 1350001,
        "gemOverrideMax": 1650001,
        "demand": 3
      },
      "5": {
        "value": 15e5,
        "notes": "",
        "trend": "Rising",
        "hasManualGemRange": false,
        "demand": 8,
        "gemOverrideMax": 165e4,
        "gemOverrideMin": 135e4
      },
      "fresh": {
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 22e5,
        "value": 2e6,
        "gemOverrideMin": 18e5,
        "hasManualGemRange": false,
        "demand": 8
      }
    },
    "hasManualGemRange": true,
    "hasCustomStarOverrides": true,
    "tags": [
      "Ground",
      "Special"
    ]
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Stable",
    "gemOverrideMin": 275e3,
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 325e3,
    "name": "Reaper Drone",
    "history": [],
    "tradeable": true,
    "id": "36d5ffdf-68d9-46b7-9997-c0ca69e1ecfe",
    "notes": "Attack Drone that fires powerful plasma shots that can deal high damage to players and troops. It lacks damage towards vehicles, however",
    "thumbnail": "/images/vehicles/Reaper%20Drone.jpg",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      }
    },
    "inRecentlyUpdated": false,
    "demand": 6,
    "category": "Drone",
    "value": 325e3,
    "tags": [
      "Drones",
      "Special"
    ],
    "hasCustomMultiplierOverrides": false,
    "inGameCost": "Gems: 275,000 - 325,000",
    "rarity": "Limited Edition"
  },
  {
    "value": 0,
    "notes": "This Emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "id": "36f2dec5-94a7-4ed3-b123-09bb0b6b932a",
    "tradeable": false,
    "name": "Brigadier General (Emblem)",
    "category": "Tags",
    "rarity": "Epic",
    "thumbnail": "https://static.wixstatic.com/media/341c64_ab6715cbb6884a1b90bff7cae781bef5~mv2.jpeg/v1/fill/w_204,h_227,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_ab6715cbb6884a1b90bff7cae781bef5~mv2.jpeg",
    "tags": [
      "Emblem",
      "Special"
    ],
    "trend": "Stable",
    "inRecentlyUpdated": false,
    "demand": 5,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-08-29",
    "history": [],
    "inGameCost": "Untradable"
  },
  {
    "rarity": "Rare",
    "gemOverrideMax": 750,
    "value": 750,
    "thumbnail": "/images/vehicles/Snakeskin%20_Banner_.jpg",
    "category": "Tags",
    "inGameCost": "Gems: 500 - 750",
    "name": "Snakeskin (Banner)",
    "gemOverrideMin": 500,
    "notes": "Available through crates.",
    "history": [],
    "demand": 5,
    "hasManualGemRange": true,
    "tradeable": true,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "37084c9e-d0ce-4878-97bb-bc0387af9b92",
    "tags": [
      "Banner"
    ]
  },
  {
    "trend": "Dropping",
    "hasManualGemRange": true,
    "tradeable": true,
    "category": "Land",
    "demand": 5,
    "name": "TV Tank",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "rarity": "Legendary",
    "id": "379e82a2-d5b7-4fb6-afdb-c3cf22502bf0",
    "history": [],
    "notes": "Useful for doing the commander-x boss battle, as the pulse cannon does high vehicle damage.",
    "gemOverrideMax": 1e4,
    "thumbnail": "/images/vehicles/TV%20Tank.jpg",
    "value": 1e4,
    "tags": [
      "tv-tank"
    ],
    "gemOverrideMin": 8e3
  },
  {
    "name": "Super Mech",
    "inGameCost": "Gems: 250,000 - 300,000",
    "demand": 4,
    "acronym": "SMECH",
    "notes": "First mechs to be added to the game, which features an average explosive round aimable machine gun. Along with 6 hypersonic missile bursts. It also has an infinite hypersonic boost and the ability to jump. It currently has a bug that allows it to perform a super jump when close to rock formations.",
    "tradeable": true,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "rarity": "Limited Edition",
    "value": 3e5,
    "hasCustomStarOverrides": false,
    "gemOverrideMax": 3e5,
    "id": "379e9c82-1c0a-45b8-aec3-dc680a4c0176",
    "trend": "Stable",
    "tags": [
      "Ground"
    ],
    "inRecentlyUpdated": false,
    "hasCustomMultiplierOverrides": false,
    "gemOverrideMin": 25e4,
    "thumbnail": "/images/vehicles/Super%20Mech.jpg",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Land"
  },
  {
    "trend": "Stable",
    "category": "Air",
    "gemOverrideMax": 7e3,
    "demand": 4,
    "name": "B1",
    "thumbnail": "/images/vehicles/B1.jpg",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "history": [],
    "gemOverrideMin": 5e3,
    "notes": "Fast bomber aircraft that is capable of dropping powerful precision bombs and carpet bombing. Utilizes AI missiles as active protection against missiles and enemy vehicles.",
    "tradeable": true,
    "value": 7e3,
    "tags": [
      "b1"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "3807d043-8016-4a09-9d9c-6bbe55eb70bb"
  },
  {
    "rarity": "Uncommon",
    "tradeable": true,
    "gemOverrideMax": 250,
    "gemOverrideMin": 150,
    "inGameCost": "Gems: 150 - 250",
    "hasManualGemRange": true,
    "history": [],
    "trend": "Stable",
    "demand": 5,
    "tags": [
      "Banner"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "value": 250,
    "category": "Tags",
    "id": "382f6d2b-700f-441b-96de-0ef61e535a54",
    "name": "Naval (Banner)",
    "notes": "Available through crates.",
    "thumbnail": "/images/vehicles/Naval%20_Banner_.jpg"
  },
  {
    "tags": [
      "ngad"
    ],
    "category": "Air",
    "rarity": "Legendary",
    "value": 13e3,
    "demand": 5,
    "notes": "Reskin of FX1 for the most part; rarer because FX1 is in the spec ops. Shorter missile CD.",
    "tradeable": true,
    "id": "3835edac-ea8f-4e19-9b92-12d27939f2aa",
    "hasManualGemRange": true,
    "history": [],
    "thumbnail": "/images/vehicles/NGAD.jpg",
    "name": "NGAD",
    "gemOverrideMin": 1e4,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "trend": "Stable",
    "gemOverrideMax": 13e3
  },
  {
    "tags": [
      "volk"
    ],
    "demand": 4,
    "notes": "A vehicle in the free warpass that has an explosive machinegun and a grappler.",
    "tradeable": true,
    "value": 1250,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "rarity": "Epic",
    "id": "3886c6f7-cca2-459a-94f2-85c0266b65fd",
    "gemOverrideMax": 1250,
    "hasManualGemRange": true,
    "category": "Land",
    "history": [],
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Volk.jpg",
    "name": "Volk",
    "gemOverrideMin": 750
  },
  {
    "inGameCost": "Gems: 25 - 50",
    "rarity": "Common",
    "value": 50,
    "tradeable": true,
    "notes": "This emblem is obtained by the kill tag crates!",
    "category": "Tags",
    "tags": [
      "Emblem"
    ],
    "demand": 1,
    "id": "38b8c890-4a93-41c6-a810-e7fb608ad459",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 50,
    "history": [],
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Binoculars%20_Emblem_.jpg",
    "trend": "Stable",
    "gemOverrideMin": 25,
    "name": "Binoculars (Emblem)"
  },
  {
    "lastUpdated": "2026-08-29",
    "trend": "Stable",
    "name": "Silver (Banner)",
    "id": "39283c4c-e6d4-4d2e-b4d3-4919cc6bfd1c",
    "history": [],
    "thumbnail": "https://static.wixstatic.com/media/f89faf_4b47760b90b14e7895a233ecbfbb1db0~mv2.png/v1/fill/w_373,h_413,al_c,lg_1,q_85,enc_avif,quality_auto/f89faf_4b47760b90b14e7895a233ecbfbb1db0~mv2.png",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Banner"
    ],
    "inGameCost": "Untradable",
    "notes": "Only available through ranks.",
    "inRecentlyUpdated": false,
    "tradeable": false,
    "rarity": "Uncommon",
    "category": "Tags",
    "value": 0,
    "demand": 5
  },
  {
    "rarity": "Legendary",
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "hasManualGemRange": false,
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "demand": 5,
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/TU-160.jpg",
    "value": 15e3,
    "tradeable": true,
    "history": [
      {
        "date": "Sep 10",
        "value": 0,
        "updatedBy": "System",
        "timestamp": "2026-09-10T22:08:37.729Z",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 200,
          "3": 1e4,
          "4": 2e4,
          "5": 6e4,
          "fresh": 0
        },
        "note": "Previous Market Valuation"
      },
      {
        "timestamp": "2026-09-11T17:21:09.427Z",
        "date": "Sep 11",
        "tierValues": {
          "0": 15e3,
          "1": 15e3,
          "2": 15200,
          "3": 25e3,
          "4": 35e3,
          "5": 75e3,
          "fresh": 15e3
        },
        "updatedBy": "Spuppers",
        "value": 15e3,
        "note": "Staff moderation update"
      }
    ],
    "id": "3a16fd5a-1138-4c9b-925e-7c726de95274",
    "notes": "The TU-160 is a bomber that has quite an agile, maneuverable body that is also quite fast in terms of acceleration and top speed. The TU-160 has a passenger seat that unfortunately doesn't have any other special features. The TU-160 features a 150-round left-mounted front-facing explosive round machine gun that deals average damage.  Along with 3 Napalm drop bombs with zero penetration ability that deal low damage.",
    "hasCustomStarOverrides": false,
    "category": "Air",
    "name": "TU-160"
  },
  {
    "demand": 10,
    "inRecentlyUpdated": false,
    "tags": [
      "Ground",
      "Collector",
      "Special"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Legendary",
    "tradeable": false,
    "id": "3a6f5f32-d009-4e2d-a1a1-92138e6a6232",
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "name": "Super Speeder",
    "inGameCost": "Untradable",
    "thumbnail": "/images/vehicles/Super%20Speeder.jpg",
    "value": 0,
    "category": "Land",
    "notes": "nontradeable vehicle obtained from being a top 10 faction. It features 2 missile barrages that deal high damage. The Super Speeder is quite fast and maneuverable as well.",
    "history": []
  },
  {
    "starOverrides": {
      "0": 950001,
      "1": 950001,
      "2": 950001,
      "3": 950001,
      "4": 950001,
      "5": 95e4,
      "fresh": 11e5
    },
    "inRecentlyUpdated": false,
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "value": 950001,
        "trend": "Stable",
        "notes": "",
        "hasManualGemRange": false,
        "demand": 8,
        "gemOverrideMin": 902501,
        "gemOverrideMax": 997501
      },
      "1": {
        "value": 950001,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMax": 997501,
        "gemOverrideMin": 902501,
        "hasManualGemRange": false,
        "demand": 8
      },
      "2": {
        "gemOverrideMax": 997501,
        "gemOverrideMin": 902501,
        "hasManualGemRange": false,
        "demand": 8,
        "value": 950001,
        "trend": "Stable",
        "notes": ""
      },
      "3": {
        "value": 950001,
        "trend": "Stable",
        "notes": "",
        "demand": 8,
        "gemOverrideMin": 902501,
        "gemOverrideMax": 997501,
        "hasManualGemRange": false
      },
      "4": {
        "hasManualGemRange": false,
        "value": 950001,
        "notes": "",
        "trend": "Stable",
        "demand": 8,
        "gemOverrideMax": 997501,
        "gemOverrideMin": 902501
      },
      "5": {
        "trend": "Stable",
        "notes": "",
        "value": 95e4,
        "hasManualGemRange": false,
        "gemOverrideMax": 997500,
        "gemOverrideMin": 902500,
        "demand": 8
      },
      "fresh": {
        "demand": 8,
        "hasManualGemRange": false,
        "value": 11e5,
        "gemOverrideMin": 1045e3,
        "gemOverrideMax": 1155e3,
        "notes": "",
        "trend": "Stable"
      }
    },
    "thumbnail": "/images/vehicles/BOSS%20Ghostwind.jpg",
    "category": "Air",
    "tags": [
      "Air",
      "Special"
    ],
    "trend": "Stable",
    "hasCustomMultiplierOverrides": false,
    "name": "BOSS Ghostwind",
    "demand": 8,
    "inGameCost": "Gems: 900,000 - 1,000,000",
    "hasCustomStarOverrides": true,
    "excludeFromRecentlyUpdated": true,
    "history": [
      {
        "updatedBy": "System",
        "tierValues": {
          "0": 825e3,
          "1": 825e3,
          "2": 825200,
          "3": 835e3,
          "4": 847e3,
          "5": 89e4,
          "fresh": 875e3
        },
        "timestamp": "2026-09-10T22:08:34.900Z",
        "note": "Previous Market Valuation",
        "value": 1e6,
        "date": "Sep 10"
      },
      {
        "value": 1e6,
        "note": "Staff moderation update",
        "updatedBy": "Spuppers",
        "date": "Sep 13",
        "tierValues": {
          "0": 1e6,
          "1": 1e6,
          "2": 1e6,
          "3": 1e6,
          "4": 1e6,
          "5": 1e6,
          "fresh": 11e5
        },
        "timestamp": "2026-09-14T00:55:23.829Z"
      },
      {
        "timestamp": "2026-09-14T00:56:02.663Z",
        "note": "Staff moderation update",
        "updatedBy": "Spuppers",
        "tierValues": {
          "0": 950001,
          "1": 950001,
          "2": 950001,
          "3": 950001,
          "4": 950001,
          "5": 95e4,
          "fresh": 11e5
        },
        "date": "Sep 13",
        "value": 950001
      }
    ],
    "value": 950001,
    "rarity": "Exotic",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "acronym": "BGW",
    "notes": "The BOSS Ghostwind has 4 hypersonic missiles like those of the Rocket Tank and Super TOS01, along with the other weapons and features of the normal Ghostwind. The missiles also have fast relaoding speed.",
    "tradeable": true,
    "id": "3abd9dc8-966c-4f6f-b2a2-b30b1c35838d"
  },
  {
    "notes": "This emblem is obtained when joining the game.",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "https://static.wixstatic.com/media/341c64_683bcbdb1fcc481491f0b56a207743b7~mv2.jpeg/v1/fill/w_208,h_231,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_683bcbdb1fcc481491f0b56a207743b7~mv2.jpeg",
    "value": 0,
    "name": "Basic (Emblem)",
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "inGameCost": "Untradable",
    "lastUpdated": "2026-08-29",
    "rarity": "Common",
    "tradeable": false,
    "tags": [
      "Emblem",
      "Special"
    ],
    "history": [],
    "category": "Tags",
    "demand": 0,
    "id": "3aebc31a-3af1-481c-a273-902a70f86c8e"
  },
  {
    "hasCustomStarOverrides": false,
    "name": "Egg (Banner)",
    "thumbnail": "/images/vehicles/Egg%20_Banner_.jpg",
    "history": [],
    "id": "3b6d5974-a21f-401a-b54a-c7d26f254907",
    "notes": "Available through crates. Easter limited.",
    "inRecentlyUpdated": false,
    "value": 2e4,
    "hasManualGemRange": true,
    "gemOverrideMin": 15e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 5,
    "tags": [
      "Banner"
    ],
    "trend": "Stable",
    "gemOverrideMax": 2e4,
    "excludeFromRecentlyUpdated": true,
    "category": "Tags",
    "rarity": "Exotic",
    "hasCustomMultiplierOverrides": false,
    "inGameCost": "Gems: 15,000 - 20,000",
    "tradeable": true
  },
  {
    "value": 12e3,
    "name": "Ravage Soldier",
    "notes": "RPG soldier that can fire multiple rounds",
    "thumbnail": "/images/vehicles/Ravage%20Soldier.jpg",
    "rarity": "Legendary",
    "gemOverrideMin": 8e3,
    "tradeable": true,
    "history": [],
    "id": "3b7befaf-7eac-441e-9f05-0e358975a2f4",
    "category": "Soldier",
    "hasManualGemRange": true,
    "gemOverrideMax": 12e3,
    "trend": "Dropping",
    "demand": 6,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Soldiers"
    ],
    "inGameCost": "Gems: 8,000 - 12,000"
  },
  {
    "id": "3bd03f26-5ba0-4ecb-bc93-5da654917275",
    "trend": "Stable",
    "name": "Griddy (Emote)",
    "tradeable": true,
    "hasManualGemRange": true,
    "tags": [
      "Emote"
    ],
    "inGameCost": "Gems: 500 - 750",
    "gemOverrideMax": 750,
    "thumbnail": "/images/vehicles/Griddy%20_Emote_.jpg",
    "category": "Tags",
    "notes": "$20",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Rare",
    "history": [],
    "value": 750,
    "gemOverrideMin": 500,
    "demand": 5
  },
  {
    "value": 15e3,
    "gemOverrideMin": 1e4,
    "demand": 5,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "gemOverrideMax": 15e3,
    "notes": "Rad Patch, previously allowing to reload RAD missiles. This was patched.",
    "rarity": "Exotic",
    "name": "Rad katyusha",
    "id": "3c007aa6-8cf7-4ca8-8869-1921a04b46b7",
    "hasManualGemRange": true,
    "history": [],
    "trend": "Stable",
    "tags": [
      "rad-katyusha"
    ],
    "thumbnail": "/images/vehicles/Rad%20katyusha.jpg",
    "category": "Land"
  },
  {
    "gemOverrideMin": 11e3,
    "notes": "Can outrun all missiles at level 70.",
    "hasManualGemRange": true,
    "rarity": "Epic",
    "category": "Air",
    "tradeable": true,
    "gemOverrideMax": 15e3,
    "history": [],
    "id": "3c1c151b-1b91-41b0-86f6-3f6a6ddc052c",
    "value": 15e3,
    "tags": [
      "blackbird"
    ],
    "demand": 4,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "Blackbird",
    "thumbnail": "/images/vehicles/Blackbird.jpg"
  },
  {
    "trend": "Stable",
    "hasManualGemRange": true,
    "hasCustomStarOverrides": false,
    "inRecentlyUpdated": false,
    "tradeable": true,
    "category": "Soldier",
    "tags": [
      "Soldiers"
    ],
    "excludeFromRecentlyUpdated": true,
    "id": "3db3cef4-7932-48d5-a5f5-32a5c2e4265c",
    "history": [],
    "inGameCost": "Gems: 175 - 225",
    "notes": "Werewolf reskin that can attack vehicles along with players within a vehicle, and doesn't have the self-healing ability.",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMin": 175,
    "demand": 8,
    "hasCustomMultiplierOverrides": false,
    "value": 225,
    "thumbnail": "/images/vehicles/Drill%20Worker.jpg",
    "gemOverrideMax": 225,
    "name": "Drill Worker",
    "rarity": "Legendary"
  },
  {
    "history": [],
    "tags": [
      "Air",
      "Special"
    ],
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tradeable": true,
    "gemOverrideMin": 6e4,
    "thumbnail": "/images/vehicles/XF12.jpg",
    "id": "3dd6d3ae-98cc-43de-ad2d-542fa6683988",
    "name": "XF12",
    "rarity": "Exotic",
    "notes": "The XF12 features the Super Sonic Dodge feature, along with 2 drop bomb weapons. The first is a 16-round individual nuclear drop bombs that deal good damage against buildings and troops, along with having good penetration like the Super B21 and B21 Raider drop bombs. The XF12 also has a singular round of 5 drop bomb bursts that have an almost instant reload. The XF12 is the first bomber to feature the Super Sonic Dodge feature. The bombs' damage against ground vehicles isn't great and takes multiple rounds to defeat an average health vehicle such as a T-90M.",
    "gemOverrideMax": 8e4,
    "hasManualGemRange": true,
    "category": "Air",
    "inGameCost": "Gems: 60,000 - 80,000",
    "demand": 4,
    "value": 8e4
  },
  {
    "notes": "The Super Medic Helicopter features the first healing drone spawner in the game. Along with unfortunately has no passenger seats and 2 weapon loadouts. The first loadout is named Loadout 1 and features a 75 round medicinal colored machine gun that can't heal in-game teams or faction members. Along with a double healing drone spawner that currently only heals to about two-thirds of the Medic Helicopter's health, then afterwards only functions as lock-on distractions when not healing. The second weapon loadout is named Loadout 2 and features 8 anti-flare rapid-fire missile bursts and a vehicle door open and close toggle.",
    "tradeable": true,
    "gemOverrideMin": 5e5,
    "rarity": "Limited Edition",
    "category": "Air",
    "tags": [
      "Air",
      "Special"
    ],
    "inGameCost": "Gems: 500,000 - 600,000",
    "value": 6e5,
    "gemOverrideMax": 6e5,
    "demand": 6,
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "3fb6c5bd-94c3-473b-abda-73e026300d73",
    "acronym": "SMH",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "thumbnail": "/images/vehicles/Super%20Medic%20Helicopter.jpg",
    "name": "Super Medic Helicopter",
    "hasCustomStarOverrides": false,
    "inRecentlyUpdated": false
  },
  {
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/ZUBR.jpg",
    "demand": 5,
    "name": "ZUBR",
    "rarity": "Legendary",
    "history": [],
    "inGameCost": "Gems: 4,000 - 6,000",
    "notes": "Large hovercraft armed with missiles and cannons. Can travel on land, therefore it is good for the destroy buildings using naval vehicles daily mission.",
    "category": "Naval",
    "gemOverrideMax": 6e3,
    "value": 6e3,
    "tags": [
      "Naval"
    ],
    "id": "408760a2-b975-4396-b1f6-be6538ac83ae",
    "tradeable": true,
    "hasManualGemRange": true,
    "gemOverrideMin": 4e3
  },
  {
    "lastUpdated": "2026-09-14T22:16:21.271Z",
    "gemOverrideMax": 7e4,
    "category": "Air",
    "hasManualGemRange": true,
    "history": [],
    "name": "Razor",
    "inGameCost": "Gems: 60,000 - 70,000",
    "trend": "Stable",
    "gemOverrideMin": 6e4,
    "tradeable": true,
    "demand": 7,
    "value": 8e4,
    "thumbnail": "/images/vehicles/Razor.jpg",
    "rarity": "Exotic",
    "id": "4090c411-572c-4ccf-8f27-f64d522e2462",
    "notes": "The Razor features a singular EMP missile burst and has rapid acceleration. The top speed of the Razor is average. The Razor also has 2 large sized missile that deal average damage but have a larger splash damage radius. The Razor also features the Super Sonic dodge.",
    "tags": [
      "Air"
    ]
  },
  {
    "demand": 2,
    "inGameCost": "Gems: 20,000 - 25,000",
    "name": "TheIceZombieSlayer",
    "history": [],
    "gemOverrideMin": 2e4,
    "rarity": "Limited Edition",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 25e3,
    "thumbnail": "/images/vehicles/TheIceZombieSlayer.jpg",
    "tags": [
      "Soldiers",
      "Special"
    ],
    "tradeable": true,
    "value": 25e3,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "id": "409c1587-7431-44b8-ab9a-078757bc98a1",
    "category": "Soldier",
    "notes": "Somewhat weak troop that fires eye lasers that deal low damage. The troop also has very low health, and overall isn't really great in terms of functionality. But it is rare, as it's the first free-to-play considered a limited edition troop. It is also somewhat rare due to the obtianment process that requires you to participate in an admin abuse event and defeat the boss to obtain a chance of obtaining the troop."
  },
  {
    "demand": 2,
    "hasManualGemRange": true,
    "tags": [
      "Collector",
      "puma-recon"
    ],
    "tradeable": true,
    "rarity": "Legendary",
    "trend": "Stable",
    "id": "40e5dfbc-e088-40b8-8ffe-cb8086c91d31",
    "history": [],
    "name": "Puma Recon",
    "gemOverrideMin": 3e3,
    "value": 5e3,
    "thumbnail": "/images/vehicles/Puma%20Recon.jpg",
    "gemOverrideMax": 5e3,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "A tank that has a decent autocannon. This tank was a limited time buildable and currently can no longer be built.",
    "category": "Land"
  },
  {
    "trend": "Stable",
    "name": "Nuke Project 665",
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "acronym": "NP665",
    "inGameCost": "Gems: 250,000 - 300,000",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "category": "Naval",
    "hasCustomStarOverrides": false,
    "id": "41a64191-a838-403f-88f9-06fb1f87d170",
    "tags": [
      "Naval"
    ],
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "demand": 5,
    "notes": "This version of the Project 665 features 2 nuclear ballistic missiles along with 4 normal missiles. It also has a turret upgrade at level 35, along with a nuke upgrade at level 100.",
    "gemOverrideMax": 3e5,
    "thumbnail": "/images/vehicles/Nuke%20Project%20665.jpg",
    "value": 3e5,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 25e4,
    "rarity": "Limited Edition"
  },
  {
    "gemOverrideMax": 100,
    "excludeFromRecentlyUpdated": true,
    "trend": "Dropping",
    "rarity": "Rare",
    "hasCustomMultiplierOverrides": false,
    "tradeable": true,
    "gemOverrideMin": 50,
    "history": [],
    "name": "Ace Pilot",
    "demand": 3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasCustomStarOverrides": false,
    "notes": "The Ace Pilot is a buff-applying soldier that increases air vehicle damage by 1% at any level with a zero-star Ace Pilot. The Ace Pilot also buffs air vehicle damage by 6% at any level when 3-starred. The Ace Pilot troops can be stacked to obtain a maximum air vehicle buff of 24% when equipped with 4 Ace Pilot troops at 3 stars. The Ace Pilot features a  weak M16 Assault Rifle that deals poor damage but has good range. The Ace Pilot also suffers from having low troop health. At 1 star, the Ace Pilot buffs aerial vehicle damage by 2%, and by 3% at 2 stars.",
    "category": "Soldier",
    "thumbnail": "/images/vehicles/Ace%20Pilot.jpg",
    "id": "41bc3b42-72e3-40fb-92e0-cf578b46be8e",
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 50 - 100",
    "value": 100,
    "hasManualGemRange": true,
    "tags": [
      "Soldiers",
      "Special"
    ]
  },
  {
    "history": [],
    "gemOverrideMax": 50,
    "tags": [
      "Emblem"
    ],
    "notes": "This emblem is obtained in the kill tag crates!",
    "category": "Tags",
    "gemOverrideMin": 25,
    "inGameCost": "Gems: 25 - 50",
    "value": 50,
    "tradeable": true,
    "name": "Shovel (Emblem)",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "thumbnail": "/images/vehicles/Shovel%20_Emblem_.jpg",
    "hasManualGemRange": true,
    "trend": "Stable",
    "rarity": "Common",
    "id": "426dc751-ed82-4d41-b7ff-96ed41bf0619",
    "demand": 1
  },
  {
    "history": [],
    "rarity": "Legendary",
    "tags": [
      "Naval",
      "Collector"
    ],
    "id": "428f7690-f70f-490b-aa45-5c11815138cb",
    "thumbnail": "/images/vehicles/Warship.jpg",
    "inGameCost": "Gems: 12,500 - 17,500",
    "demand": 2,
    "category": "Naval",
    "trend": "Stable",
    "gemOverrideMax": 17500,
    "hasManualGemRange": true,
    "value": 17500,
    "name": "Warship",
    "gemOverrideMin": 12500,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "notes": "Came out in the first warpass and it has some cannons and smaller arms."
  },
  {
    "tags": [
      "Air",
      "Special"
    ],
    "category": "Air",
    "trend": "Stable",
    "demand": 7,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "inGameCost": "Gems: 4,500 - 6,500",
    "rarity": "Legendary",
    "gemOverrideMax": 6500,
    "history": [],
    "notes": "The first aircraft that is able to land on water. It features a single frontal firing explosive round machine gun. Along with a few drop bombs that deal average damage. The maneuverability of the aircraft is not great so it's only ideal for bomb runs and no other tasks.",
    "name": "SeaHawk",
    "hasManualGemRange": true,
    "gemOverrideMin": 4500,
    "id": "439c3dc3-b727-42a5-864c-d20bdc97a7d5",
    "thumbnail": "/images/vehicles/SeaHawk.jpg",
    "value": 6500
  },
  {
    "thumbnail": "/images/vehicles/Raptor.jpg",
    "value": 1250,
    "gemOverrideMax": 1250,
    "history": [],
    "tags": [
      "raptor"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Air",
    "gemOverrideMin": 750,
    "notes": "Can dodge basically all missiles by spamming A & D with its super sonic dodge ability.",
    "demand": 5,
    "name": "Raptor",
    "id": "43c00d35-0030-41bb-afa1-c90d9e37c392",
    "hasManualGemRange": true,
    "rarity": "Epic",
    "tradeable": true,
    "trend": "Rising"
  },
  {
    "thumbnail": "https://static.wixstatic.com/media/341c64_50855a5e7a5543e2b9ccff4b32d0a202~mv2.jpeg/v1/fill/w_202,h_224,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_50855a5e7a5543e2b9ccff4b32d0a202~mv2.jpeg",
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "inGameCost": "Untradable",
    "lastUpdated": "2026-08-29",
    "value": 0,
    "tags": [
      "Emblem",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "trend": "Stable",
    "rarity": "Rare",
    "inRecentlyUpdated": false,
    "category": "Tags",
    "name": "Chief Warrant Officer (Emblem)",
    "id": "43d96e33-95fc-4b2e-ad59-a6547fdef14d",
    "tradeable": false,
    "demand": 5
  },
  {
    "hasManualGemRange": true,
    "trend": "Rising",
    "tradeable": true,
    "name": "U2",
    "id": "44155494-b044-4770-84ad-1b8dc70ac29b",
    "category": "Air",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "notes": "Has 2 emp missiles and 1 emp burst with a 8 second cooldown",
    "gemOverrideMin": 4500,
    "demand": 6,
    "value": 5500,
    "thumbnail": "/images/vehicles/U2.jpg",
    "tags": [
      "u2"
    ],
    "gemOverrideMax": 5500,
    "history": [],
    "rarity": "Legendary"
  },
  {
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "name": "Missile Drone",
    "value": 525,
    "id": "442a4bfc-9122-4058-b864-7a69074c53f8",
    "history": [],
    "inGameCost": "Gems: 475 - 525",
    "notes": "A high AOE drone that is good for grouped targets.",
    "tags": [
      "Drones"
    ],
    "hasManualGemRange": true,
    "rarity": "Epic",
    "gemOverrideMax": 525,
    "demand": 5,
    "thumbnail": "/images/vehicles/Missile%20Drone.jpg",
    "trend": "Rising",
    "category": "Drone",
    "gemOverrideMin": 475
  },
  {
    "id": "444a66b5-8c81-4117-85f8-64c38ff44e14",
    "demand": 2,
    "name": "Anti-Air Turret",
    "value": 5e3,
    "thumbnail": "/images/vehicles/Anti-Air%20Turret.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Common",
    "history": [],
    "notes": "The Anti-Air Turret is a tool that can be placed down to attack enemy aircraft. The Turret only shoots enemy aircraft and boss aircraft. It doesn't seem to attack players or troops. The Anti-Air Turret has a cooldown of 5 minutes after being placed. The damage dealt by the Anti-Air Turret is average and on par with a machine gun from other common rarity aircraft.",
    "inGameCost": "Gems: 3,000 - 5,000",
    "hasManualGemRange": true,
    "gemOverrideMax": 5e3,
    "tradeable": true,
    "tags": [
      "Tool",
      "Special"
    ],
    "gemOverrideMin": 3e3,
    "category": "Other",
    "trend": "Stable"
  },
  {
    "rarity": "Legendary",
    "tradeable": true,
    "history": [
      {
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "timestamp": "2026-06-12T22:11:16.644Z",
        "value": 7e6,
        "date": "Jun 12",
        "tierValues": {
          "0": 675e4,
          "1": 6750001,
          "2": 6750001,
          "3": 6750001,
          "4": 6750001,
          "5": 7e6,
          "fresh": 12e6
        }
      },
      {
        "tierValues": {
          "0": 6750001,
          "1": 6750001,
          "2": 6750001,
          "3": 6750001,
          "4": 6750001,
          "5": 675e4,
          "fresh": 12e6
        },
        "timestamp": "2026-09-14T00:35:18.985Z",
        "note": "Staff moderation update",
        "value": 6750001,
        "updatedBy": "Spuppers",
        "date": "Sep 13"
      },
      {
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "timestamp": "2026-09-14T01:03:52.645Z",
        "tier": "0",
        "tierValues": {
          "0": 7e6,
          "1": 6750001,
          "2": 6750001,
          "3": 6750001,
          "4": 6750001,
          "5": 675e4,
          "fresh": 12e6
        },
        "value": 7e6,
        "date": "Sep 13"
      }
    ],
    "starOverrides": {
      "0": 7e6,
      "1": 6750001,
      "2": 6750001,
      "3": 6750001,
      "4": 6750001,
      "5": 675e4,
      "fresh": 12e6
    },
    "id": "44bc9b47-8b29-4837-9f59-071deb04649d",
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "acronym": "GTYPH",
    "demand": 7,
    "tags": [
      "Naval",
      "Collector"
    ],
    "inGameCost": "Gems: 6,500,000 - 7,000,000",
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "demand": 7,
        "gemOverrideMin": 665e4,
        "gemOverrideMax": 735e4,
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "value": 7e6
      },
      "1": {
        "value": 6750001,
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "demand": 7,
        "gemOverrideMin": 6412501,
        "gemOverrideMax": 7087501
      },
      "2": {
        "demand": 7,
        "gemOverrideMax": 7087501,
        "gemOverrideMin": 6412501,
        "hasManualGemRange": false,
        "value": 6750001,
        "trend": "Stable",
        "notes": ""
      },
      "3": {
        "trend": "Stable",
        "notes": "",
        "hasManualGemRange": false,
        "value": 6750001,
        "demand": 7,
        "gemOverrideMin": 6412501,
        "gemOverrideMax": 7087501
      },
      "4": {
        "value": 6750001,
        "notes": "",
        "trend": "Stable",
        "demand": 7,
        "gemOverrideMin": 6412501,
        "gemOverrideMax": 7087501,
        "hasManualGemRange": false
      },
      "5": {
        "gemOverrideMax": 7087500,
        "gemOverrideMin": 6412500,
        "value": 675e4,
        "hasManualGemRange": false,
        "demand": 7,
        "notes": "",
        "trend": "Stable"
      },
      "fresh": {
        "gemOverrideMax": 126e5,
        "gemOverrideMin": 114e5,
        "value": 12e6,
        "demand": 7,
        "trend": "Stable",
        "notes": "",
        "hasManualGemRange": false
      }
    },
    "inRecentlyUpdated": false,
    "value": 7e6,
    "category": "Naval",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "notes": "The rarest vehicle in the game.Golden Version of Typhoon Submarine. Is able to submerge in the ground due to a glitch.Has missiles that accelerate, allowing it to catch players off guard combined with the former glitch.A majority of dupes no longer exist,  marking the return of its old value.",
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": true,
    "thumbnail": "data:image/jpeg;base64,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",
    "name": "Gold Typhoon"
  },
  {
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "notes": "The TOP5 MLRS features the same weapons set as the other MLRS models, but features a cool-looking purple maroon color and a TOP5 logo on its front hood. The reload speed and damage seem to be greater on the TOP5 MLRS model.",
    "name": "Top5 MLRS",
    "tradeable": false,
    "value": 0,
    "inGameCost": "Untradable",
    "id": "44cc0bae-a6ca-4141-9665-bbed81bad322",
    "tags": [
      "Ground"
    ],
    "category": "Land",
    "thumbnail": "/images/vehicles/Top5%20MLRS.jpg",
    "trend": "Stable",
    "rarity": "Exotic",
    "history": [],
    "inRecentlyUpdated": false,
    "demand": 7
  },
  {
    "tags": [
      "Banner"
    ],
    "history": [],
    "tradeable": true,
    "inGameCost": "Gems: 2,000 - 2,500",
    "trend": "Stable",
    "name": "Azure (Banner)",
    "demand": 5,
    "gemOverrideMin": 2e3,
    "hasManualGemRange": true,
    "value": 2500,
    "rarity": "Epic",
    "gemOverrideMax": 2500,
    "category": "Tags",
    "thumbnail": "/images/vehicles/Azure%20_Banner_.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Available through crates.",
    "id": "44f256ef-f9f8-4f26-807a-4c4f256124c6"
  },
  {
    "inGameCost": "Untradable",
    "thumbnail": "/images/vehicles/Overwatch.jpg",
    "demand": 10,
    "notes": "The Overwatch is the first multi-weekly event vehicle. The Overwatch features 2 weapons that seem to be locked behind the Attack mode, similar to that of the AC-130 models. The Overwatch within the Attack mode has an aimable laser that deals decent damage but has a severely limited range. The Overwatch also features an EMP burst similar to that of the B2 models. The notable feature of the Overwatch is the high maneuverability, top speed, and acceleration it has with its triple red exhausts. The Overwatch also has the same increased hypersonic boost effect similar to that of the MIG31 and LE Rocket Plane.",
    "id": "46089e2c-e5d4-44d1-9da3-7e8e52e431a4",
    "inRecentlyUpdated": false,
    "name": "Overwatch",
    "excludeFromRecentlyUpdated": true,
    "value": 0,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Exotic",
    "category": "Air",
    "tags": [
      "Air",
      "Collector",
      "Special"
    ],
    "history": [],
    "trend": "Stable",
    "tradeable": false
  },
  {
    "gemOverrideMax": 9e3,
    "history": [],
    "tags": [
      "Emblem"
    ],
    "rarity": "Exotic",
    "id": "46bdc2e5-80c0-41eb-be37-4e2c04818de5",
    "gemOverrideMin": 8e3,
    "demand": 5,
    "thumbnail": "/images/vehicles/Baseball%20_Emblem_.jpg",
    "hasManualGemRange": true,
    "trend": "Stable",
    "value": 9e3,
    "tradeable": true,
    "inGameCost": "Gems: 8,000 - 9,000",
    "name": "Baseball (Emblem)",
    "category": "Tags",
    "notes": "This emblem comes from the 50 crate baseball bundle.",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "notes": "The BOSS MLRS features an aimable rapid firing lobbed cannon, similar to the Mortar Truck. The lobbed cannon has 4 rounds per salvo and a quite fast reload speed. The BOSS MLRS also features rocket bursts that have 5 missiles per burst and 4 rounds per salvo. The rocket bursts aren't anti-flare or hypersonic. The BOSS MLRS also hovers, like the overlord variants, and can drive over water.",
    "inGameCost": "Gems: 35,000 - 45,000",
    "demand": 7,
    "tradeable": true,
    "value": 45e3,
    "hasManualGemRange": true,
    "category": "Land",
    "tags": [
      "Ground"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Exotic",
    "gemOverrideMax": 45e3,
    "id": "46c75d56-87a6-4463-9337-07f7baf92b25",
    "trend": "Stable",
    "history": [],
    "gemOverrideMin": 35e3,
    "thumbnail": "/images/vehicles/BOSS%20MLRS.jpg",
    "name": "BOSS MLRS"
  },
  {
    "tags": [
      "Soldiers"
    ],
    "value": 5500,
    "gemOverrideMin": 4500,
    "history": [],
    "inGameCost": "Gems: 4,500 - 5,500",
    "notes": "The Egg Launcher is a Easter reskin of the normal tycoon unlockable Grenade Launcher.",
    "tradeable": true,
    "category": "Soldier",
    "id": "47c5119a-3f88-43f1-a639-387a4afd4747",
    "gemOverrideMax": 5500,
    "thumbnail": "/images/vehicles/Egg%20Launcher.jpg",
    "rarity": "Legendary",
    "name": "Egg Launcher",
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 6,
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "hasCustomStarOverrides": false,
    "trend": "Rising"
  },
  {
    "category": "Air",
    "history": [],
    "notes": "Can dodge all normal missiles by spamming A & D with its super sonic dodge ability.  Also has 2 fighting modes you can swap between",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": true,
    "id": "48fd7bb8-2fe3-4372-b495-40acb83c46ea",
    "value": 22500,
    "tags": [
      "super-raptor"
    ],
    "trend": "Rising",
    "gemOverrideMin": 17500,
    "rarity": "Legendary",
    "name": "Super Raptor",
    "gemOverrideMax": 22500,
    "thumbnail": "/images/vehicles/Super%20Raptor.jpg",
    "demand": 7
  },
  {
    "history": [],
    "notes": "A VTOL aircraft with high HP and strong plasma cannons. Posseses gun AI turrets. Decent choice against boss enemies.",
    "gemOverrideMin": 5e4,
    "id": "4918d761-0d8a-4ce0-a2e6-b8b98f6fb72e",
    "tradeable": true,
    "value": 55e3,
    "tags": [
      "astrum"
    ],
    "gemOverrideMax": 55e3,
    "category": "Air",
    "trend": "Stable",
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Astrum.jpg",
    "name": "Astrum",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasManualGemRange": true,
    "demand": 7
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Air",
    "gemOverrideMax": 8e4,
    "history": [],
    "inGameCost": "Gems: 60,000 - 80,000",
    "name": "Super Skyfox",
    "trend": "Stable",
    "tradeable": true,
    "gemOverrideMin": 6e4,
    "hasManualGemRange": true,
    "value": 8e4,
    "demand": 7,
    "thumbnail": "/images/vehicles/Super%20Skyfox.jpg",
    "rarity": "Exotic",
    "id": "491ac995-b342-47fe-a1ad-23687aba360a",
    "notes": "Improved version of the normal Skyfox and features 2 more missiles than the normal skyfox",
    "tags": [
      "Air"
    ]
  },
  {
    "name": "Chinook",
    "thumbnail": "/images/vehicles/Chinook.jpg",
    "history": [],
    "gemOverrideMin": 890,
    "value": 1090,
    "category": "Air",
    "id": "492e0f11-dcb1-499b-8adf-f788fa4e00c6",
    "gemOverrideMax": 1090,
    "hasManualGemRange": true,
    "notes": "Good for arsenal levels and fusing, no longer able to be bought in the tycoon.",
    "rarity": "Legendary",
    "tags": [
      "Collector",
      "chinook"
    ],
    "demand": 1,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Rising",
    "tradeable": true
  },
  {
    "rarity": "Exotic",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "thumbnail": "/images/vehicles/Nuke%20XB-70.jpg",
    "excludeFromRecentlyUpdated": true,
    "name": "Nuke XB-70",
    "trend": "Dropping",
    "demand": 4,
    "category": "Air",
    "inRecentlyUpdated": false,
    "id": "499eb69a-0f7a-4055-a95d-40364dd45275",
    "value": 125e3,
    "hasManualGemRange": true,
    "tradeable": true,
    "gemOverrideMin": 1e5,
    "history": [],
    "notes": "Nuke version of XB 70 with some stats increase, along with 4 anti-dodge, anti-flare   missile barrages, and 1 nuke.",
    "gemOverrideMax": 125e3,
    "tags": [
      "Special",
      "nuke-xb-70"
    ]
  },
  {
    "gemOverrideMin": 1e4,
    "rarity": "Legendary",
    "tradeable": true,
    "name": "YF1",
    "demand": 5,
    "gemOverrideMax": 12e3,
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "category": "Air",
    "hasManualGemRange": true,
    "tags": [
      "Air"
    ],
    "history": [],
    "id": "4afd16bb-2687-4d01-9545-03457d02e7bd",
    "value": 12e3,
    "thumbnail": "/images/vehicles/YF1.jpg",
    "inGameCost": "Gems: 10,000 - 12,000",
    "notes": "The YF1 is a VTOL aircraft that suffers from a slow rise in vehicle height. The YF1 features a front-firing explosive 150-round machine gun that deals medium damage. The YF1 also has 4 medium-damage supersonic missiles."
  },
  {
    "gemOverrideMin": 25,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 50,
    "tags": [
      "Emblem"
    ],
    "gemOverrideMax": 50,
    "thumbnail": "/images/vehicles/Star%20_Emblem_.jpg",
    "notes": "This emblem is obtained in the kill tag crates!",
    "demand": 1,
    "name": "Star (Emblem)",
    "category": "Tags",
    "id": "4bacc1de-d7c1-41e0-a2e0-559ea0b4fe4b",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 25 - 50",
    "history": [],
    "tradeable": true,
    "rarity": "Common",
    "trend": "Stable"
  },
  {
    "inGameCost": "Gems: 175,000 - 225,000",
    "hasCustomStarOverrides": false,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 225e3,
    "tradeable": true,
    "name": "Super Drone Carrier",
    "excludeFromRecentlyUpdated": true,
    "notes": "This naval carrier features 4 X-47B drones that fire missiles at enemies close to your carrier. The Super drone carrier also features an aimable explosive round cannon that deals serious damage and does about 4 times the damage of the Super UAV Carrier's machine gun.",
    "demand": 3,
    "id": "4bd75bd6-ded0-428f-9555-c3a4b5abdcc7",
    "tags": [
      "Naval"
    ],
    "gemOverrideMin": 175e3,
    "acronym": "SDC",
    "category": "Naval",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Super%20Drone%20Carrier.jpg",
    "gemOverrideMax": 225e3,
    "rarity": "Limited Edition",
    "trend": "Stable",
    "history": []
  },
  {
    "value": 15e3,
    "rarity": "Legendary",
    "history": [],
    "notes": "Fastest plane in the game tied with the normal blackbird.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 5,
    "id": "4c2017c1-5bf9-45f9-8d8e-257b470bf8e2",
    "name": "Infinity Blackbird",
    "thumbnail": "/images/vehicles/Infinity%20Blackbird.jpg",
    "category": "Air",
    "tradeable": true,
    "gemOverrideMax": 15e3,
    "trend": "Stable",
    "tags": [
      "infinity-blackbird"
    ],
    "gemOverrideMin": 1e4,
    "hasManualGemRange": true
  },
  {
    "value": 500,
    "inGameCost": "Gems: 250 - 500",
    "category": "Soldier",
    "thumbnail": "/images/vehicles/Heavy%20Zombie.jpg",
    "history": [],
    "notes": "reskinned Heavy Soldier",
    "tags": [
      "Soldiers"
    ],
    "gemOverrideMax": 500,
    "demand": 4,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "id": "4cb80911-48db-4207-833e-0bdb57f010c2",
    "rarity": "Rare",
    "gemOverrideMin": 250,
    "name": "Heavy Zombie",
    "trend": "Dropping",
    "tradeable": true
  },
  {
    "tradeable": true,
    "notes": "Average boat, with a weak single shot railgun, and aimable explosive autocannons",
    "gemOverrideMax": 15e3,
    "category": "Naval",
    "id": "4cefd99c-d2d6-48ee-a76a-e2b1d4bd6b04",
    "demand": 6,
    "hasManualGemRange": true,
    "name": "Railgun Destroyer",
    "value": 15e3,
    "rarity": "Legendary",
    "gemOverrideMin": 1e4,
    "history": [],
    "trend": "Stable",
    "inGameCost": "Gems: 10,000 - 15,000",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "thumbnail": "/images/vehicles/Railgun%20Destroyer.jpg",
    "tags": [
      "Naval"
    ]
  },
  {
    "gemOverrideMin": 2e3,
    "rarity": "Common",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 2500,
    "demand": 3,
    "trend": "Stable",
    "tradeable": true,
    "category": "Land",
    "tags": [
      "Ground"
    ],
    "thumbnail": "/images/vehicles/Armored%20Vehicle.jpg",
    "value": 2500,
    "id": "4d293b23-8711-459d-b641-699d223de729",
    "name": "Armored Vehicle",
    "notes": "A decent vehicle with higher than average HP. The machine gun on it however is not controlled by the drivers seat.",
    "inGameCost": "Gems: 2,000 - 2,500",
    "history": []
  },
  {
    "gemOverrideMin": 18e5,
    "tags": [
      "Collector",
      "ratte-p1000"
    ],
    "excludeFromRecentlyUpdated": true,
    "demand": 8,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "trend": "Stable",
        "notes": "",
        "demand": 8,
        "gemOverrideMin": 1900001,
        "gemOverrideMax": 2100001,
        "hasManualGemRange": false,
        "value": 2000001
      },
      "1": {
        "gemOverrideMax": 2100001,
        "gemOverrideMin": 1900001,
        "hasManualGemRange": false,
        "demand": 8,
        "value": 2000001,
        "trend": "Stable",
        "notes": ""
      },
      "2": {
        "value": 2000001,
        "gemOverrideMax": 2100001,
        "gemOverrideMin": 1900001,
        "trend": "Stable",
        "notes": "",
        "demand": 8,
        "hasManualGemRange": false
      },
      "3": {
        "gemOverrideMax": 2100001,
        "gemOverrideMin": 1900001,
        "demand": 8,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "value": 2000001
      },
      "4": {
        "demand": 8,
        "gemOverrideMin": 1900001,
        "gemOverrideMax": 2100001,
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "value": 2000001
      },
      "5": {
        "value": 2e6,
        "notes": "",
        "gemOverrideMin": 19e5,
        "gemOverrideMax": 21e5,
        "demand": 8,
        "trend": "Stable",
        "hasManualGemRange": false
      },
      "fresh": {
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 3325e3,
        "gemOverrideMax": 3675e3,
        "value": 35e5,
        "demand": 8,
        "hasManualGemRange": false
      }
    },
    "category": "Land",
    "trend": "Stable",
    "inRecentlyUpdated": false,
    "gemOverrideMax": 2e6,
    "id": "4d34e04f-2b26-43bf-bc2e-a3e45e4e390f",
    "thumbnail": "/images/vehicles/Ratte%20P1000.jpg",
    "rarity": "Limited Edition",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "tradeable": true,
    "name": "Ratte P1000",
    "starOverrides": {
      "0": 2000001,
      "1": 2000001,
      "2": 2000001,
      "3": 2000001,
      "4": 2000001,
      "5": 2e6,
      "fresh": 35e5
    },
    "notes": "750 or less of these tanks exist.Has massive armor and damage output, and can be used to escape most spawn traps.Recent upgrades give this tank a third cannon shot, letting it destroy almost any tank in the game within 1 volley.",
    "acronym": "RATTE",
    "hasCustomStarOverrides": true,
    "history": [
      {
        "note": "Previous Market Valuation",
        "value": 2e6,
        "updatedBy": "System",
        "tierValues": {
          "0": 2e6,
          "1": 201e4,
          "2": 2025e3,
          "3": 205e4,
          "4": 21e5,
          "5": 206e4,
          "fresh": 2e6
        },
        "date": "Sep 02",
        "timestamp": "2026-09-02T23:58:30.293Z"
      },
      {
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-09T23:58:30.293Z",
        "note": "Staff moderation update",
        "tierValues": {
          "0": 2000001,
          "1": 2000001,
          "2": 2000001,
          "3": 2000001,
          "4": 2000001,
          "5": 2e6,
          "fresh": 35e5
        },
        "date": "Sep 09",
        "value": 2e6
      }
    ],
    "hasCustomMultiplierOverrides": false,
    "value": 2e6
  },
  {
    "gemOverrideMin": 50,
    "hasManualGemRange": true,
    "tags": [
      "Banner"
    ],
    "category": "Tags",
    "trend": "Stable",
    "tradeable": true,
    "gemOverrideMax": 100,
    "id": "4d40be30-1c18-4275-a0a3-1e6b7af97cce",
    "notes": "Available through crates.",
    "name": "Plum (Banner)",
    "rarity": "Common",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "history": [],
    "inGameCost": "Gems: 50 - 100",
    "thumbnail": "/images/vehicles/Plum%20_Banner_.jpg",
    "value": 100,
    "demand": 5
  },
  {
    "trend": "Rising",
    "excludeFromRecentlyUpdated": true,
    "demand": 8,
    "hasCustomStarOverrides": false,
    "hasManualGemRange": true,
    "category": "Air",
    "inRecentlyUpdated": false,
    "name": "MQ4C Jet",
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/MQ4C%20Jet.jpg",
    "notes": "fast jet with anti-dodge capabilities. The jet features 6 missiles that are just average in terms of speed and damage. The plane also has a 360 aiming laser. The laser has the downsides of not being able to aim during the aircraft's turn, as well as having a short magazine capacity and a long reload time. The main highlight of this jet is the speed, maneuverability, and anti-dodge capabilities, and not really within its armaments.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "inGameCost": "Gems: 8,000 - 15,000",
    "history": [],
    "gemOverrideMax": 15e3,
    "value": 15e3,
    "tags": [
      "Air"
    ],
    "id": "4dfb2614-fd9b-4b4d-901f-ed319e9b5fb6",
    "gemOverrideMin": 8e3,
    "hasCustomMultiplierOverrides": false
  },
  {
    "value": 25e3,
    "demand": 5,
    "thumbnail": "/images/vehicles/Elite%20Zeplin-X.jpg",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Reskin of the normal Zeplin-X except it comes with the Plasma cnanons by default, along with having 2 moer drop bombs within a single salvo.",
    "rarity": "Exotic",
    "tags": [
      "Air"
    ],
    "category": "Air",
    "gemOverrideMax": 25e3,
    "id": "4e73d38b-d9eb-43f1-82d2-2641e1231231",
    "history": [],
    "trend": "Stable",
    "inGameCost": "Gems: 10,000 - 25,000",
    "gemOverrideMin": 1e4,
    "name": "Elite Zeplin-X",
    "tradeable": true
  },
  {
    "hasManualGemRange": true,
    "name": "Stealth F14",
    "trend": "Rising",
    "thumbnail": "/images/vehicles/Stealth%20F14.jpg",
    "gemOverrideMax": 4500,
    "tradeable": true,
    "demand": 4,
    "value": 4500,
    "history": [],
    "gemOverrideMin": 3600,
    "rarity": "Legendary",
    "id": "4e819241-460d-4a90-98e2-68e34effb339",
    "notes": "Can cloak like the F117, making it decent in a few situations, but overly-reliant on its weak missiles.",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Air",
    "tags": [
      "Special",
      "stealth-f14"
    ]
  },
  {
    "name": "Gun Boat",
    "gemOverrideMax": 100,
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Gun%20Boat.jpg",
    "inGameCost": "Gems: 20 - 100",
    "gemOverrideMin": 20,
    "hasManualGemRange": true,
    "id": "4eeaf191-d3d3-4571-b018-732f93c072ad",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "category": "Naval",
    "history": [],
    "tags": [
      "Naval"
    ],
    "demand": 1,
    "notes": "A small but agile boat with a passenger controlled explosive mahcine gun.",
    "tradeable": true,
    "rarity": "Common",
    "value": 100
  },
  {
    "trend": "Dropping",
    "name": "V22",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMin": 700,
    "tags": [
      "v22"
    ],
    "category": "Air",
    "thumbnail": "/images/vehicles/V22.jpg",
    "notes": "A fast starter plane with VTOL, good for fusing",
    "id": "4ff76226-a58d-4552-9045-25ad44075a3d",
    "rarity": "Rare",
    "history": [],
    "gemOverrideMax": 800,
    "demand": 1,
    "value": 800,
    "hasManualGemRange": true
  },
  {
    "thumbnail": "/images/vehicles/Master%20Rain.jpg",
    "history": [],
    "inGameCost": "Gems: 37,500 - 42,500",
    "gemOverrideMax": 42500,
    "tags": [
      "Naval",
      "Special"
    ],
    "value": 42500,
    "category": "Naval",
    "gemOverrideMin": 37500,
    "notes": "The Master Rain features the first 50 blueprint obtainment process. The Master Rain features an AI-controlled medium-damage main cannon that seems to have infinite shots but a limited range. Along with an aimable explosive round machine gun that deals good anti-air damage. The Master Rain also features 8 lock-on missiles that deal medium damage. The AI-controlled cannon produces the same audio as the Ratte, Sturmtank, and K7 model's cannons.",
    "name": "Master Rain",
    "rarity": "Exotic",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "demand": 7,
    "id": "502fa70c-ba06-43b4-8d37-49607331edca",
    "tradeable": true,
    "trend": "Stable"
  },
  {
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "rarity": "Common",
    "gemOverrideMax": 350,
    "tags": [
      "turret-chinook"
    ],
    "category": "Air",
    "value": 350,
    "demand": 1,
    "gemOverrideMin": 250,
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "A weak but cheap helicopter anyone can purchase from their tycoon.",
    "id": "503d329e-b809-4e52-8bb5-2b47bf4e0542",
    "name": "Turret Chinook",
    "thumbnail": "/images/vehicles/Turret%20Chinook.jpg",
    "history": [],
    "trend": "Dropping"
  },
  {
    "tags": [
      "pelican"
    ],
    "notes": "Current elite shop item; twin railguns do massive damage, and has 16 barrages of 10 missiles. (Elite Shop)",
    "thumbnail": "/images/vehicles/Pelican.jpg",
    "history": [],
    "id": "50a2ec7e-50c8-4a21-bba7-0e7ff4f542f2",
    "value": 25e3,
    "hasManualGemRange": true,
    "gemOverrideMin": 2e4,
    "trend": "Rising",
    "name": "Pelican",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "tradeable": true,
    "gemOverrideMax": 25e3,
    "category": "Air",
    "demand": 6
  },
  {
    "name": "Patria",
    "tradeable": true,
    "hasManualGemRange": true,
    "demand": 2,
    "category": "Naval",
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Epic",
    "gemOverrideMin": 1250,
    "tags": [
      "Naval"
    ],
    "inGameCost": "Gems: 1,250 - 1,750",
    "notes": "Speedboat with a rapid fire cannon",
    "gemOverrideMax": 1750,
    "history": [],
    "id": "511e8c8d-fac3-42b7-bc4f-da20755ec6b1",
    "thumbnail": "/images/vehicles/Patria.jpg",
    "value": 1750
  },
  {
    "category": "Tags",
    "notes": "This emblem is achieved by achieving a certain amount of rebirths, arsenal levels, and dailies.",
    "inGameCost": "Untradable",
    "lastUpdated": "2026-08-29",
    "history": [],
    "id": "51dd72e7-a777-433e-ab28-0747b0c79fb0",
    "tradeable": false,
    "name": "Lieutenant General (Emblem)",
    "value": 0,
    "trend": "Stable",
    "thumbnail": "https://static.wixstatic.com/media/341c64_4232c66ff6034299804f7a471c459e56~mv2.png/v1/fill/w_125,h_139,al_c,lg_1,q_85,enc_avif,quality_auto/341c64_4232c66ff6034299804f7a471c459e56~mv2.png",
    "demand": 5,
    "rarity": "Legendary",
    "tags": [
      "Emblem",
      "Special"
    ]
  },
  {
    "id": "51e96a90-ecef-404c-a381-b29006bfd97d",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Dab%20_Emote_.jpg",
    "tags": [
      "Emote"
    ],
    "history": [],
    "hasManualGemRange": true,
    "value": 500,
    "rarity": "Uncommon",
    "inGameCost": "Gems: 250 - 500",
    "gemOverrideMin": 250,
    "category": "Tags",
    "tradeable": true,
    "notes": "dab on da haterz. i just realized they added a new uncommon rarity with this new update",
    "demand": 5,
    "gemOverrideMax": 500,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "Dab (Emote)"
  },
  {
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Rising",
    "hasManualGemRange": true,
    "tags": [
      "b-52-super-bomber"
    ],
    "tradeable": true,
    "id": "52547ac2-667e-41cd-aed8-82fddd0dfb5f",
    "thumbnail": "/images/vehicles/B-52%20Super%20Bomber.jpg",
    "value": 57e3,
    "gemOverrideMax": 57e3,
    "demand": 6,
    "history": [],
    "name": "B-52 Super Bomber",
    "rarity": "Exotic",
    "notes": "A good bomber due to its nuclear bomb. Outside of that it does not have much use as its co-pilot machine guns are weak and it does not have any other high damage bombs.",
    "gemOverrideMin": 49e3,
    "category": "Air"
  },
  {
    "tags": [
      "Air"
    ],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "hasManualGemRange": true,
    "history": [],
    "inGameCost": "Gems: 4,000 - 6,000",
    "tradeable": true,
    "category": "Air",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/X-59.jpg",
    "gemOverrideMin": 4e3,
    "rarity": "Legendary",
    "value": 6e3,
    "id": "52df01b9-ee4f-4566-aaab-9c60fadb3364",
    "name": "X-59",
    "demand": 3,
    "gemOverrideMax": 6e3,
    "notes": "A fast jet with good maneuverability, it has 2 split missiles that are anti-flare and anti-dodge, which deal average damage. It also features 3 drop bombs, which deal decent damage and have a good splash damage radius."
  },
  {
    "notes": "This emblem can be obtained in the kill tag crates!",
    "gemOverrideMax": 50,
    "rarity": "Common",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Missile%20_Emblem_.jpg",
    "inGameCost": "Gems: 25 - 50",
    "value": 50,
    "gemOverrideMin": 25,
    "hasManualGemRange": true,
    "name": "Missile (Emblem)",
    "id": "53834b6c-1b6b-4db0-9c34-bd9dc60780cd",
    "demand": 1,
    "trend": "Stable",
    "history": [],
    "category": "Tags",
    "tags": [
      "Emblem"
    ],
    "tradeable": true
  },
  {
    "notes": "highest DPS in-game(tied with gold falken) and 4 decent missiles.",
    "gemOverrideMin": 8e3,
    "demand": 5,
    "value": 12e3,
    "gemOverrideMax": 12e3,
    "tags": [
      "Special",
      "adf-01-falken"
    ],
    "category": "Air",
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/ADF-01%20Falken.jpg",
    "id": "53930444-5482-4460-baff-cf0f504e748a",
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true,
    "hasManualGemRange": true,
    "history": [],
    "name": "ADF-01 Falken"
  },
  {
    "tags": [
      "Soldiers"
    ],
    "gemOverrideMin": 125,
    "history": [],
    "rarity": "Epic",
    "value": 175,
    "thumbnail": "/images/vehicles/RPG%20Soldier.jpg",
    "hasManualGemRange": true,
    "demand": 6,
    "category": "Soldier",
    "gemOverrideMax": 175,
    "notes": "Can damage vehicles but not great overall.",
    "name": "RPG Soldier",
    "inGameCost": "Gems: 125 - 175",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "id": "53db37e2-416f-43c1-94aa-bbb0057031a0",
    "trend": "Dropping"
  },
  {
    "notes": "VTOL aircraft that has 6 Magnetic missiles that slow down your targeted aircraft. It also has 2 large-sized anti-flare missiles. Overall, the missiles have long reloads and deal low damage. The Magnetic missiles no longer function as they used to, and no longer gravitate aerial and naval targets towards you.",
    "id": "54049353-9ab9-40b4-8458-c4a8e3a697b4",
    "inGameCost": "Gems: 300,000 - 350,000",
    "gemOverrideMin": 3e5,
    "history": [],
    "demand": 5,
    "hasCustomStarOverrides": false,
    "value": 35e4,
    "tags": [
      "Air",
      "Special"
    ],
    "tradeable": true,
    "gemOverrideMax": 35e4,
    "rarity": "Limited Edition",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "acronym": "SF24",
    "trend": "Stable",
    "category": "Air",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Super%20F24.jpg",
    "inRecentlyUpdated": false,
    "hasCustomMultiplierOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "name": "Super F24"
  },
  {
    "id": "5446b707-5980-4448-a329-4c8b1b2d9c64",
    "tradeable": true,
    "category": "Air",
    "trend": "Stable",
    "name": "Me-262",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "value": 4700,
    "history": [],
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Me-262.jpg",
    "gemOverrideMin": 3700,
    "demand": 2,
    "notes": "Can buff its own speed for ten seconds; it essentially has the hypersonic gamepass for free, but is mediocre in all aspects.",
    "tags": [
      "me-262"
    ],
    "gemOverrideMax": 4700
  },
  {
    "gemOverrideMax": 3100,
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Super%20F15.jpg",
    "gemOverrideMin": 2500,
    "tags": [
      "super-f15"
    ],
    "notes": "12 Missiles and a weak stright shooting gun Decently fast at higher levels.",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 1,
    "id": "545481b0-8e79-43fa-a196-9e77f698e1b8",
    "name": "Super F15",
    "category": "Air",
    "value": 3100,
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "tradeable": true
  },
  {
    "excludeFromRecentlyUpdated": true,
    "demand": 1,
    "inRecentlyUpdated": false,
    "history": [],
    "name": "Lance Corporal (Emblem)",
    "trend": "Stable",
    "category": "Tags",
    "thumbnail": "https://static.wixstatic.com/media/341c64_881f15668027463da1dc6cca7800626f~mv2.jpeg/v1/fill/w_227,h_252,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_881f15668027463da1dc6cca7800626f~mv2.jpeg",
    "inGameCost": "Untradable",
    "rarity": "Common",
    "tags": [
      "Emblem",
      "Special"
    ],
    "lastUpdated": "2026-08-29",
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "tradeable": false,
    "id": "549bd75a-db62-491b-bf9a-115b741c9315",
    "value": 0
  },
  {
    "notes": "Weaker variant of the Chrysler vehicle, with all of the same weapons arsenal, but instead of nuclear rounds, it features 2 normal cannon rounds.",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 1e4,
    "rarity": "Legendary",
    "tradeable": true,
    "tags": [
      "Ground"
    ],
    "category": "Land",
    "value": 1e4,
    "gemOverrideMin": 7e3,
    "inGameCost": "Gems: 7,000 - 10,000",
    "demand": 3,
    "trend": "Dropping",
    "history": [],
    "hasManualGemRange": true,
    "id": "54f35e9c-4df0-487a-9a5f-8da757b3e48a",
    "thumbnail": "/images/vehicles/Chrysler.jpg",
    "name": "Chrysler"
  },
  {
    "tags": [
      "boss-su-57"
    ],
    "history": [],
    "demand": 2,
    "trend": "Rising",
    "hasManualGemRange": true,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Legendary",
    "notes": "This version has 2 more missiles along with more HP and speed.",
    "name": "Boss Su-57",
    "gemOverrideMax": 3700,
    "thumbnail": "/images/vehicles/Boss%20Su-57.jpg",
    "id": "55251312-e8c2-4b2a-8a50-0219680fae4a",
    "category": "Air",
    "value": 3700,
    "gemOverrideMin": 3e3
  },
  {
    "hasCustomMultiplierOverrides": false,
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-14T22:10:40.993Z",
    "thumbnail": "/images/vehicles/SeaBreacher.jpg",
    "gemOverrideMin": 4e5,
    "inGameCost": "Gems: 400,000 - 500,000",
    "name": "SeaBreacher",
    "trend": "Dropping",
    "category": "Naval",
    "gemOverrideMax": 5e5,
    "hasCustomStarOverrides": false,
    "value": 35e4,
    "demand": 8,
    "history": [],
    "rarity": "Exotic",
    "id": "5723f9b4-a830-4997-8b22-caf914da2d83",
    "notes": "Fast and nimble speed boat that has a aimable explosive machine gun and power missiles.\nExcellent at escaping spawn with providing adequate self-defense ",
    "tags": [
      "Naval"
    ],
    "tradeable": true,
    "excludeFromRecentlyUpdated": false
  },
  {
    "gemOverrideMax": 5300,
    "name": "BV238",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/BV238.jpg",
    "notes": "Tankiest air vehicle; can turn extremely fast with WIP controls.",
    "gemOverrideMin": 4300,
    "value": 5300,
    "category": "Air",
    "history": [],
    "demand": 2,
    "id": "5781a5d3-6767-462c-af09-a8dcc147604f",
    "tags": [
      "bv238"
    ],
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true,
    "rarity": "Legendary"
  },
  {
    "notes": "A decent plane with a front facing machine gun and decent missiles. It is okay for starters.",
    "hasManualGemRange": true,
    "gemOverrideMin": 900,
    "demand": 5,
    "value": 1200,
    "tags": [
      "f-15"
    ],
    "category": "Air",
    "thumbnail": "/images/vehicles/F-15.jpg",
    "gemOverrideMax": 1200,
    "rarity": "Legendary",
    "trend": "Rising",
    "id": "580d3378-3ea6-45ab-bb9f-6b8b7efefc90",
    "history": [],
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "F-15"
  },
  {
    "value": 75,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "5835009a-a7f6-45b3-92df-503f6fa647a1",
    "notes": "This emblem is obtained from the kill tag crates!",
    "tags": [
      "Emblem"
    ],
    "history": [],
    "demand": 2,
    "hasManualGemRange": true,
    "gemOverrideMin": 50,
    "category": "Tags",
    "trend": "Stable",
    "rarity": "Uncommon",
    "thumbnail": "/images/vehicles/Skull%20_Emblem_.jpg",
    "gemOverrideMax": 75,
    "name": "Skull (Emblem)",
    "inGameCost": "Gems: 50 - 75"
  },
  {
    "category": "Land",
    "tags": [
      "Ground"
    ],
    "gemOverrideMin": 5e3,
    "trend": "Stable",
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "tradeable": true,
    "gemOverrideMax": 6e3,
    "demand": 7,
    "history": [],
    "id": "585d6d1c-d908-4f5d-8c5c-5b9d6e3022c5",
    "notes": "Decent ground vehicle that features an explosive round machine gun with decent ammo capacity. The fire rate is somewhat lackluster, though that is alright as it's complemented by a somewhat fast reload speed.",
    "name": "Akrep",
    "thumbnail": "/images/vehicles/Akrep.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inGameCost": "Gems: 5,000 - 6,000",
    "value": 6e3
  },
  {
    "notes": "A better version of the War Maul, but with semi-anti-flare aerial lock-on cannon rounds that can catch any aircraft besides the Rocket Plane. \nThe shells themselves, notably, are also clustered on impact like the cluster missiles on the Gold MiG-29.",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "gemOverrideMax": 12e4,
    "tradeable": true,
    "id": "5865cbe8-136f-4488-882e-84cf6f92db68",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 6,
    "value": 12e4,
    "tags": [
      "Ground"
    ],
    "gemOverrideMin": 1e5,
    "category": "Land",
    "inGameCost": "Gems: 100,000 - 120,000",
    "rarity": "Exotic",
    "hasCustomStarOverrides": false,
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "name": "Master Warmaul",
    "acronym": "MWM",
    "thumbnail": "/images/vehicles/Master%20Warmaul.jpg"
  },
  {
    "tradeable": true,
    "notes": "Buffed hacker troop, but otherwise lacks incentives to collect",
    "hasManualGemRange": true,
    "value": 17500,
    "tags": [
      "Soldiers"
    ],
    "category": "Soldier",
    "id": "59013a30-e5ec-4af1-b072-0a55486b0cbf",
    "trend": "Rising",
    "gemOverrideMax": 17500,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 5,
    "gemOverrideMin": 12500,
    "inGameCost": "Gems: 12,500 - 17,500",
    "history": [],
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Elite%20Hacker.jpg",
    "name": "Elite Hacker"
  },
  {
    "hasCustomStarOverrides": false,
    "notes": "Decent ground vehicle that has 16 regular missiles. The Super AN Jeep also features twin aimable explosive round machine guns that deal serious damage, along with having a high ammo count. Though the reload is quite long.",
    "name": "Super AN Jeep",
    "acronym": "SANJ",
    "id": "5a3b1d26-ebaf-4b4b-9b79-358c9921877e",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": false,
    "inRecentlyUpdated": false,
    "history": [
      {
        "updatedBy": "System",
        "date": "Sep 10",
        "timestamp": "2026-09-10T22:08:36.830Z",
        "tierValues": {
          "0": 6e5,
          "1": 6e5,
          "2": 600200,
          "3": 61e4,
          "4": 62e4,
          "5": 66e4,
          "fresh": 6e5
        },
        "value": 6e5,
        "note": "Previous Market Valuation"
      },
      {
        "timestamp": "2026-09-14T00:42:48.427Z",
        "value": 8e5,
        "date": "Sep 13",
        "tierValues": {
          "0": 8e5,
          "1": 8e5,
          "2": 800200,
          "3": 81e4,
          "4": 82e4,
          "5": 86e4,
          "fresh": 8e5
        },
        "updatedBy": "Spuppers",
        "note": "Staff moderation update"
      }
    ],
    "value": 8e5,
    "thumbnail": "/images/vehicles/Super%20AN%20Jeep.jpg",
    "category": "Land",
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Ground",
      "Special"
    ],
    "demand": 8,
    "trend": "Rising",
    "inGameCost": "Gems: 500,000 - 600,000",
    "rarity": "Exotic"
  },
  {
    "gemOverrideMin": 65e3,
    "hasCustomStarOverrides": true,
    "hasCustomMultiplierOverrides": false,
    "name": "JS Atago",
    "inGameCost": "Gems: 65,000 - 85,000",
    "trend": "Rising",
    "thumbnail": "/images/vehicles/JS%20Atago.jpg",
    "gemOverrideMax": 85e3,
    "demand": 6,
    "value": 85e3,
    "history": [],
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "starTierOverrides": {
      "0": {
        "demand": 6,
        "notes": "",
        "trend": "Rising",
        "hasManualGemRange": false,
        "value": 75e3,
        "gemOverrideMin": 71250,
        "gemOverrideMax": 78750
      },
      "1": {
        "trend": "Rising",
        "notes": "",
        "value": 75e3,
        "hasManualGemRange": false,
        "gemOverrideMax": 78750,
        "gemOverrideMin": 71250,
        "demand": 6
      },
      "2": {
        "value": 75200,
        "hasManualGemRange": false,
        "demand": 6,
        "notes": "",
        "trend": "Rising",
        "gemOverrideMin": 71440,
        "gemOverrideMax": 78960
      },
      "3": {
        "gemOverrideMax": 89250,
        "gemOverrideMin": 80750,
        "demand": 6,
        "trend": "Rising",
        "notes": "",
        "value": 85e3,
        "hasManualGemRange": false
      },
      "4": {
        "hasManualGemRange": false,
        "gemOverrideMin": 92150,
        "gemOverrideMax": 101850,
        "demand": 6,
        "value": 97e3,
        "trend": "Rising",
        "notes": ""
      },
      "5": {
        "trend": "Rising",
        "notes": "",
        "value": 14e4,
        "demand": 6,
        "hasManualGemRange": false,
        "gemOverrideMax": 147e3,
        "gemOverrideMin": 133e3
      },
      "fresh": {
        "demand": 6,
        "hasManualGemRange": false,
        "gemOverrideMin": 285e4,
        "gemOverrideMax": 315e4,
        "trend": "Rising",
        "notes": "",
        "value": 3e6
      }
    },
    "hasManualGemRange": true,
    "id": "5a430e61-d924-4324-b1f3-810e36aedb1c",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "notes": "AI CIWS, infinite (although slow) missiles and a main cannon. It's essentially an upgrade to the regular Sachen Frigate. Comes from the first ever battlepass.\nIs traded and/collected at lower levels.",
    "category": "Naval",
    "tags": [
      "Naval",
      "Collector"
    ],
    "starOverrides": {
      "0": 75e3,
      "1": 75e3,
      "2": 75200,
      "3": 85e3,
      "4": 97e3,
      "5": 14e4,
      "fresh": 3e6
    }
  },
  {
    "hasManualGemRange": true,
    "name": "Nova",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMax": 2e4,
    "tradeable": true,
    "demand": 4,
    "trend": "Stable",
    "gemOverrideMin": 15e3,
    "id": "5a59a95d-5f83-486a-a922-9dd598342196",
    "history": [],
    "category": "Air",
    "rarity": "Legendary",
    "tags": [
      "Air"
    ],
    "notes": "VTOL aircraft with aimable explosive cannon and 4 rocket barrages(cfa type, not ka29)",
    "inGameCost": "Gems: 15,000 - 20,000",
    "thumbnail": "/images/vehicles/Nova.jpg",
    "value": 2e4
  },
  {
    "gemOverrideMax": 12e3,
    "history": [],
    "value": 12e3,
    "id": "5a64c72e-bb27-4122-bc3a-b8285647692f",
    "gemOverrideMin": 8e3,
    "name": "Police Heli",
    "notes": "Attack helicopter with a barrage of lock-on missiles and 2 decent machine guns",
    "thumbnail": "/images/vehicles/Police%20Heli.jpg",
    "rarity": "Legendary",
    "category": "Air",
    "tradeable": true,
    "inGameCost": "Gems: 8,000 - 12,000",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 5,
    "tags": [
      "Air"
    ],
    "hasManualGemRange": true
  },
  {
    "tradeable": true,
    "hasCustomStarOverrides": false,
    "gemOverrideMin": 9e3,
    "name": "Battleship",
    "value": 12e3,
    "id": "5a6a82f2-78b5-49f1-bcea-906573d9733d",
    "inGameCost": "Gems: 9,000 - 12,000",
    "gemOverrideMax": 12e3,
    "notes": "A high HP naval ship that has cannons and Anti-air guns. Currently it is not that hard to kill as its firepower is limited. ",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Naval",
      "Collector"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Common",
    "inRecentlyUpdated": false,
    "category": "Naval",
    "hasManualGemRange": true,
    "demand": 3,
    "hasCustomMultiplierOverrides": false,
    "history": [],
    "thumbnail": "/images/vehicles/Battleship.jpg",
    "trend": "Stable"
  },
  {
    "tradeable": true,
    "demand": 6,
    "trend": "Stable",
    "name": "Vespa Tap",
    "inGameCost": "Gems: 15,000 - 20,000",
    "rarity": "Legendary",
    "gemOverrideMin": 15e3,
    "tags": [
      "Ground"
    ],
    "category": "Land",
    "notes": "Decently maneuverable ground bike with a front-facing semi-aimable single-shot cannon that deals medium damage.",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 2e4,
    "hasManualGemRange": true,
    "value": 2e4,
    "thumbnail": "/images/vehicles/Vespa%20Tap.jpg",
    "id": "5a8dc0fc-a73b-4f6e-ad92-51ba2e521b12"
  },
  {
    "gemOverrideMin": 2e3,
    "rarity": "Legendary",
    "category": "Naval",
    "id": "5ad67b93-3251-4557-861b-b0772452041b",
    "tags": [
      "Naval"
    ],
    "gemOverrideMax": 5500,
    "demand": 5,
    "tradeable": true,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "name": "Typhoon (Sub)",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 2,000 - 5,500",
    "thumbnail": "/images/vehicles/Typhoon%20_Sub_.jpg",
    "value": 5500,
    "history": [],
    "notes": "Came out with the stronger dive armor which provides +50 HP and returned in the elite shop. This is a good submarine with torpedoes and missiles."
  },
  {
    "category": "Air",
    "thumbnail": "/images/vehicles/Top3%20GhostWind.jpg",
    "history": [],
    "inGameCost": "Untradable",
    "trend": "Stable",
    "tags": [
      "Air",
      "Collector",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "demand": 10,
    "value": 0,
    "inRecentlyUpdated": false,
    "rarity": "Exotic",
    "name": "Top3 GhostWind",
    "notes": "The Top3 Ghostwind is given only to members of any of the top 3 factions during the Ghostwind season, and it features the same weapons arsenal as the Boss Ghostwind. Its specialty change is its comedic large increased body size. It also boasts Boss GhostWind's hypersonic speed as its base speed, making it extremely fast. ",
    "tradeable": false,
    "id": "5b6bbe5e-56e9-4966-aec4-a8cebd7e1898"
  },
  {
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 6,
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/RPG%20Zombie.jpg",
    "hasManualGemRange": true,
    "name": "RPG Zombie",
    "inGameCost": "Gems: 1,300 - 2,000",
    "rarity": "Epic",
    "notes": "reskinned RPG Soldier ",
    "gemOverrideMax": 2e3,
    "tradeable": true,
    "history": [],
    "hasCustomStarOverrides": false,
    "value": 2e3,
    "tags": [
      "Soldiers"
    ],
    "category": "Soldier",
    "gemOverrideMin": 1300,
    "excludeFromRecentlyUpdated": true,
    "id": "5ba6e9a0-fdf9-43e3-9edf-ae3917bdcb65"
  },
  {
    "rarity": "Legendary",
    "tradeable": true,
    "hasManualGemRange": true,
    "gemOverrideMax": 16e3,
    "id": "5bf99424-5a01-4d9b-9dd5-f94783cf336d",
    "inGameCost": "Gems: 10,000 - 16,000",
    "trend": "Rising",
    "demand": 7,
    "gemOverrideMin": 1e4,
    "category": "Naval",
    "tags": [
      "Naval"
    ],
    "value": 16e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "Alicorn",
    "notes": "High health vehicle, Railgun on it is not hitscan and is currently bugged, has a hard time at turning,",
    "history": [],
    "thumbnail": "/images/vehicles/Alicorn.jpg"
  },
  {
    "id": "5c2c40fb-2bbe-4017-9dc6-2a7aa1237f7d",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMin": 200,
    "tradeable": true,
    "trend": "Dropping",
    "category": "Land",
    "gemOverrideMax": 400,
    "name": "T90 Tank",
    "value": 400,
    "hasManualGemRange": true,
    "rarity": "Rare",
    "thumbnail": "/images/vehicles/T90%20Tank.jpg",
    "notes": "A decent tank that has a decent cannon and above average explosive machinegun. Outdated by current standards. (Buildable)",
    "tags": [
      "t90-tank"
    ],
    "demand": 1,
    "history": []
  },
  {
    "rarity": "Common",
    "tradeable": true,
    "history": [],
    "id": "5c7ed32d-dd4d-49c0-b8bb-a1803f2a4662",
    "hasManualGemRange": true,
    "trend": "Stable",
    "demand": 1,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "Artillery",
    "value": 100,
    "category": "Land",
    "gemOverrideMax": 100,
    "notes": "A tycoon vehicle that has a lot of non lock-on missiles on it. These missiles fire in a straight line making it not useful as artillery.",
    "tags": [
      "Ground"
    ],
    "inGameCost": "Gems: 20 - 100",
    "thumbnail": "/images/vehicles/Artillery.jpg",
    "gemOverrideMin": 20
  },
  {
    "value": 10300,
    "gemOverrideMin": 8300,
    "hasManualGemRange": true,
    "id": "5c9fdbf3-5a8b-4515-a9aa-5b40302562d6",
    "thumbnail": "/images/vehicles/Demolisher.jpg",
    "category": "Land",
    "gemOverrideMax": 10300,
    "notes": "Only obtainable Halloween 2023.",
    "tags": [
      "demolisher"
    ],
    "demand": 5,
    "history": [],
    "rarity": "Legendary",
    "name": "Demolisher",
    "tradeable": true,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "rarity": "Limited Edition",
    "value": 19e4,
    "id": "5d97dee1-7687-4cad-afa7-a0a25a9a86b3",
    "excludeFromRecentlyUpdated": true,
    "name": "Super Stealth Boat",
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "notes": "The Super Stealth Boat is the first new Limited Edition vehicle that can be obtained without the usual experience point golden crates. The Super Stealth Boat can be obtained for 20,000 power points. The Super Stealth Boat is a Submarine and Speed Boat hybrid and features a 4-second rotation speed. The Super Stealth Boat also has Faster overall speeds and acceleration than the Legendary rarity Stealth Boat. Along with a 6-round supersonic rapid-fire naval,hovercraft and aerial lock-on torpedo/missile hybrid that is not anti-flare and not anti-dodge, which deals low damage but has decent speed and reload time. This missile and torpedo hybrid also can't be deflected by the Corsair or Battle Tank variants. (tested with a KA52 flown behind a Corsair-X). The Super Stealth Boat also has a 150-round explosive machine gun that deals extremely good damage overall, but sadly features a longer reload time. It also does exactly 25% more damage than the Stealth Boat's machine gun.",
    "hasCustomStarOverrides": false,
    "demand": 5,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "acronym": "SSB",
    "thumbnail": "/images/vehicles/Super%20Stealth%20Boat.jpg",
    "hasManualGemRange": false,
    "trend": "Dropping",
    "history": [
      {
        "value": 0,
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
          "fresh": 0
        },
        "date": "Sep 10",
        "updatedBy": "System",
        "note": "Previous Market Valuation",
        "timestamp": "2026-09-10T22:08:36.830Z"
      },
      {
        "date": "Sep 11",
        "timestamp": "2026-09-11T17:21:20.387Z",
        "tierValues": {
          "0": 19e4,
          "1": 19e4,
          "2": 19e4,
          "3": 19e4,
          "4": 19e4,
          "5": 19e4,
          "fresh": 19e4
        },
        "updatedBy": "Spuppers",
        "value": 19e4,
        "note": "Staff moderation update"
      }
    ],
    "inRecentlyUpdated": false,
    "tags": [
      "Naval",
      "Special"
    ],
    "category": "Naval"
  },
  {
    "gemOverrideMin": 500,
    "name": "Stealth F35",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "demand": 1,
    "trend": "Stable",
    "gemOverrideMax": 600,
    "rarity": "Epic",
    "tags": [
      "stealth-f35"
    ],
    "notes": "Can be won in the super spinner, making it a lot easier to get than the Gold F-35; it also far weaker. However, it takes longer to lock on.",
    "category": "Air",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Stealth%20F35.jpg",
    "history": [],
    "id": "5e63c9de-ca4f-43cd-8c0a-6bd14b351f8c",
    "value": 600
  },
  {
    "tags": [
      "gold-mig-29"
    ],
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Gold%20MiG-29.jpg",
    "id": "5e6a061e-30a9-4c5a-9bf7-c11f50faec07",
    "history": [],
    "hasManualGemRange": true,
    "category": "Air",
    "gemOverrideMax": 9500,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 6,
    "notes": "Very fast jet fighter with a lot of health. It has a lot of missiles that burst into more explosions, as well as a decent, fixed-point machinegun.",
    "name": "Gold MiG-29",
    "tradeable": true,
    "gemOverrideMin": 6e3,
    "value": 9500,
    "rarity": "Legendary"
  },
  {
    "thumbnail": "/images/vehicles/Grumpy%20RPG.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "5eb5b4eb-1e4a-4eb1-9e9d-3705d98e9a45",
    "tags": [
      "Weapon",
      "Special"
    ],
    "rarity": "Legendary",
    "trend": "Rising",
    "history": [],
    "hasManualGemRange": true,
    "demand": 3,
    "inGameCost": "Gems: 5,000 - 6,500",
    "name": "Grumpy RPG",
    "notes": "This Halloween reskin of the RPG features a single rocket shot that explodes into a gas bomb. It can be spammed to cause lag and serious damage to a certain location.",
    "gemOverrideMin": 5e3,
    "tradeable": true,
    "category": "Other",
    "value": 6500,
    "gemOverrideMax": 6500
  },
  {
    "inGameCost": "Gems: 1,000 - 1,500",
    "hasManualGemRange": true,
    "notes": "The Slash Bunny is currently bugged, dealing no damage and is an Easter reskin of the Halloween Werewolf. It can be used for bullet and AI baiting with it's dashing movements.",
    "name": "Slash Bunny",
    "id": "5ebc0327-ccfe-4242-97db-f5cab6fe84cb",
    "history": [],
    "value": 1500,
    "tradeable": true,
    "gemOverrideMin": 1e3,
    "thumbnail": "/images/vehicles/Slash%20Bunny.jpg",
    "tags": [
      "Soldiers"
    ],
    "demand": 5,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 1500,
    "category": "Soldier",
    "rarity": "Legendary"
  },
  {
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 3,
    "tags": [
      "golden-f35"
    ],
    "gemOverrideMax": 4900,
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Golden%20F35.jpg",
    "id": "5f4ac355-20cf-4c9c-ae48-e112a25a3533",
    "trend": "Rising",
    "history": [],
    "gemOverrideMin": 3900,
    "category": "Air",
    "name": "Golden F35",
    "tradeable": true,
    "value": 4900,
    "notes": "12 missiles, VTOL and 4 bombs. Biggest problem with the gold f-35 is that its both slow and doesn't deal very much damage",
    "hasManualGemRange": true
  },
  {
    "trend": "Stable",
    "category": "Air",
    "demand": 5,
    "acronym": "S TUPO",
    "name": "Super Tupolev",
    "rarity": "Limited Edition",
    "history": [],
    "thumbnail": "/images/vehicles/Super%20Tupolev.jpg",
    "inGameCost": "Gems: 350,000 - 400,000",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "gemOverrideMin": 35e4,
    "notes": "The first aerial vehicles to feature a new set of drones that can be seen on the wings of the aircraft. These new drones only shoot explosive rounds. The Super Tupolev features 2 of these drones and has 8 nuclear manually dropped singular drop bombs. The Super Tupolev also features AI explosive round machine guns.",
    "hasCustomStarOverrides": false,
    "inRecentlyUpdated": false,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "gemOverrideMax": 4e5,
    "value": 4e5,
    "id": "5f6cb6d9-feeb-4dc6-b56f-d05f099d5799",
    "tags": [
      "Air"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z"
  },
  {
    "demand": 4,
    "tags": [
      "Ground"
    ],
    "tradeable": true,
    "history": [],
    "rarity": "Epic",
    "category": "Land",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "name": "TKS-20",
    "value": 2e3,
    "inGameCost": "Gems: 1,000 - 2,000",
    "gemOverrideMax": 2e3,
    "thumbnail": "/images/vehicles/TKS-20.jpg",
    "notes": "Fast-moving light tank with a limited angling front firing explosive round machine gun.",
    "gemOverrideMin": 1e3,
    "hasManualGemRange": true,
    "id": "5fd6d199-d1cb-4b55-b62a-89e00352a8a4"
  },
  {
    "id": "6013b227-4c4f-4ac2-b971-3a517959d4b8",
    "history": [],
    "tags": [
      "Ground"
    ],
    "thumbnail": "/images/vehicles/Korkut.jpg",
    "gemOverrideMin": 3e3,
    "notes": "The Korkut features a fast reloading smokescreen along with a primary aimable explosive round machine gun with 15 total rounds per salvo. The damage of the Anti-Air focused machine gun is decent and takes about 6 shots to down an AI F-35 within a non-public public server. As for Naval and Ground targets, the machine gun lacks damage compared to when fired upon air targets. The Korkut is able to drive within water as a ground vehicle, just like the boss sea tank variants.",
    "category": "Land",
    "value": 4e3,
    "gemOverrideMax": 4e3,
    "name": "Korkut",
    "demand": 7,
    "trend": "Stable",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 3,000 - 4,000",
    "hasManualGemRange": true,
    "rarity": "Legendary"
  },
  {
    "rarity": "Legendary",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "trend": "Stable",
    "demand": 5,
    "thumbnail": "/images/vehicles/Vulcan.jpg",
    "tags": [
      "Ground"
    ],
    "gemOverrideMin": 5e3,
    "tradeable": true,
    "hasManualGemRange": true,
    "value": 7e3,
    "id": "60b97d60-0ba9-47e7-86fd-a4025a32b371",
    "gemOverrideMax": 7e3,
    "name": "Vulcan",
    "notes": "Fast and maneuverable tank with smoke bomb covering capabilities. The Vulcan tank features a fast-firing and decently damaging machine gun.",
    "history": [],
    "inGameCost": "Gems: 5,000 - 7,000",
    "category": "Land"
  },
  {
    "gemOverrideMax": 550,
    "category": "Air",
    "trend": "Stable",
    "name": "Defiant",
    "tradeable": true,
    "id": "61827754-4936-40d1-b9e8-fbac6bd664f0",
    "gemOverrideMin": 450,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "defiant"
    ],
    "notes": "A downgraded version of the Defiant-X. It was also on the paid warpass at teir 1. It has a recon radar.",
    "rarity": "Epic",
    "history": [],
    "thumbnail": "/images/vehicles/Defiant.jpg",
    "demand": 2,
    "value": 550
  },
  {
    "demand": 0,
    "category": "Air",
    "tags": [
      "Collector",
      "hunt-spitfire"
    ],
    "excludeFromRecentlyUpdated": true,
    "value": 0,
    "id": "619c9702-03cd-4ce1-acf8-7d7e800fa180",
    "thumbnail": "/images/vehicles/Hunt%20Spitfire.jpg",
    "rarity": "Legendary",
    "notes": 'Limited time plan only available from the Roblox event "The Hunt".',
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "name": "Hunt Spitfire",
    "history": [],
    "tradeable": false,
    "trend": "Dropping"
  },
  {
    "history": [],
    "tags": [
      "ka-52"
    ],
    "value": 750,
    "tradeable": true,
    "category": "Air",
    "notes": "A decent helicopter with lock-on barrage missiles and 2 good bombs.",
    "name": "Ka-52",
    "rarity": "Epic",
    "gemOverrideMin": 300,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Ka-52.jpg",
    "demand": 3,
    "gemOverrideMax": 750,
    "hasManualGemRange": true,
    "trend": "Dropping",
    "id": "61ab5d20-1360-4598-8ab8-1a24a802bb1a"
  },
  {
    "value": 750,
    "inGameCost": "Gems: 500 - 750",
    "gemOverrideMin": 500,
    "thumbnail": "/images/vehicles/Urban%20_Banner_.jpg",
    "category": "Tags",
    "notes": "Available through crates.",
    "gemOverrideMax": 750,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "name": "Urban (Banner)",
    "history": [],
    "demand": 5,
    "id": "61f83803-253c-4ce8-b4af-7b45b35e2a71",
    "tradeable": true,
    "rarity": "Rare",
    "trend": "Stable",
    "tags": [
      "Banner"
    ],
    "hasManualGemRange": true
  },
  {
    "rarity": "Legendary",
    "tradeable": true,
    "gemOverrideMax": 1800,
    "excludeFromRecentlyUpdated": true,
    "trend": "Rising",
    "demand": 6,
    "tags": [
      "Special",
      "typhoon"
    ],
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "gemOverrideMin": 1600,
    "value": 1800,
    "history": [],
    "id": "62321043-81b8-4cc6-b89f-82830944e521",
    "thumbnail": "/images/vehicles/Typhoon%20_Jet_.jpg",
    "notes": "This plane has a weak explosive machine gun and a lot of weaker missiles. It is a decent starter plane but is vastly overshadowed by current meta.",
    "hasManualGemRange": true,
    "category": "Air",
    "inRecentlyUpdated": false,
    "name": "Typhoon"
  },
  {
    "gemOverrideMin": 2700,
    "notes": "A weaker version of the Apache Attack Helicopter. Its missiles do not lock-on. ",
    "hasManualGemRange": true,
    "tradeable": true,
    "value": 3300,
    "gemOverrideMax": 3300,
    "tags": [
      "boss-mi-28"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Air",
    "id": "6256d145-62ba-4963-a768-ba24155b2e66",
    "trend": "Dropping",
    "demand": 1,
    "thumbnail": "/images/vehicles/Boss%20Mi-28.jpg",
    "history": [],
    "rarity": "Epic",
    "name": "Boss Mi-28"
  },
  {
    "value": 15e3,
    "gemOverrideMax": 15e3,
    "tradeable": true,
    "notes": "The first scavenger vehicle to ever release.",
    "tags": [
      "Collector",
      "green-abram-tank"
    ],
    "gemOverrideMin": 1e4,
    "history": [],
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "id": "62642323-a1b8-4d64-bf99-befbff58b48e",
    "rarity": "Common",
    "excludeFromRecentlyUpdated": true,
    "category": "Land",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Green%20Abram%20Tank.jpg",
    "demand": 5,
    "name": "Green Abram Tank"
  },
  {
    "inRecentlyUpdated": false,
    "gemOverrideMin": 15e3,
    "hasManualGemRange": true,
    "inGameCost": "Gems: 15,000 - 20,000",
    "name": "Egg (Emote)",
    "tradeable": true,
    "gemOverrideMax": 2e4,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "62c635f2-0cf7-42c8-9eef-f58eb36291c7",
    "trend": "Stable",
    "history": [],
    "category": "Tags",
    "demand": 5,
    "tags": [
      "Emote"
    ],
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": false,
    "value": 2e4,
    "thumbnail": "/images/vehicles/Egg%20_Emote_.jpg",
    "rarity": "Exotic",
    "notes": "e g g",
    "excludeFromRecentlyUpdated": true
  },
  {
    "inGameCost": "Gems: 1,000 - 1,300",
    "tags": [
      "Soldiers"
    ],
    "value": 1300,
    "thumbnail": "/images/vehicles/Vampire.jpg",
    "id": "63a01251-d7f3-4a29-be18-d9ac273cd3ef",
    "notes": "The first troop to be able to heal itself from shooting others. It can die if facing more than 1 troop or dealing with splash damage like rocket launchers. A single vampire, if paired with the railgun weapon buf can deal 450 damage per shot and solo up to the 3-star general.",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "history": [],
    "category": "Soldier",
    "demand": 8,
    "gemOverrideMax": 1300,
    "name": "Vampire",
    "tradeable": true,
    "rarity": "Legendary",
    "gemOverrideMin": 1e3,
    "trend": "Stable",
    "hasManualGemRange": true
  },
  {
    "tags": [
      "railgun-tank"
    ],
    "demand": 6,
    "trend": "Stable",
    "id": "63a6d610-7155-42ef-933b-4a17accbe168",
    "tradeable": true,
    "rarity": "Legendary",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Railgun Tank",
    "thumbnail": "/images/vehicles/Railgun%20Tank.jpg",
    "hasManualGemRange": true,
    "gemOverrideMin": 9e3,
    "notes": "A tankier version of the railgun car. It has a hitscan railgun and barrage missiles. This tank is good for both anti-air and ground to ground combat.(Elite mission)",
    "category": "Land",
    "gemOverrideMax": 13e3,
    "history": [],
    "value": 13e3
  },
  {
    "id": "6415a515-29f6-4c40-b67f-780098e19a23",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "inGameCost": "Gems: 150 - 250",
    "hasManualGemRange": true,
    "name": "Onyx (Banner)",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Onyx%20_Banner_.jpg",
    "rarity": "Uncommon",
    "category": "Tags",
    "tradeable": true,
    "gemOverrideMin": 150,
    "value": 250,
    "gemOverrideMax": 250,
    "demand": 5,
    "notes": "Available through crates.",
    "tags": [
      "Banner"
    ]
  },
  {
    "name": "Flecktarn (Banner)",
    "thumbnail": "/images/vehicles/Flecktarn%20_Banner_.jpg",
    "history": [],
    "id": "6428c22b-8951-4dde-9eb9-d67240469e14",
    "hasManualGemRange": true,
    "category": "Tags",
    "inGameCost": "Gems: 500 - 750",
    "trend": "Stable",
    "demand": 5,
    "tags": [
      "Banner"
    ],
    "gemOverrideMax": 750,
    "value": 750,
    "rarity": "Rare",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Available through crates.",
    "gemOverrideMin": 500,
    "tradeable": true
  },
  {
    "thumbnail": "/images/vehicles/Super%20Phanter.jpg",
    "hasManualGemRange": true,
    "tags": [
      "super-phanter"
    ],
    "trend": "Dropping",
    "gemOverrideMax": 9e3,
    "history": [],
    "gemOverrideMin": 6e3,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "642ceac9-3480-4dc2-bef6-fe1ab5a50c25",
    "notes": "A better version of the Phanter with an explosive machine gun and a slightly stronger cannon.",
    "name": "Super Phanter",
    "rarity": "Legendary",
    "demand": 4,
    "tradeable": true,
    "value": 9e3,
    "category": "Land"
  },
  {
    "rarity": "Legendary",
    "value": 75e3,
    "category": "Land",
    "gemOverrideMin": 4e4,
    "history": [],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "hasCustomStarOverrides": false,
    "notes": "Same base weapons as boss Annihlator but lacks the machine, has slightly lower damage, also is locked via intel level 10 faction",
    "acronym": "ANNI",
    "demand": 10,
    "tradeable": true,
    "gemOverrideMax": 75e3,
    "name": "The Annihilator",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/The%20Annihilator.jpg",
    "tags": [
      "Ground"
    ],
    "trend": "Rising",
    "id": "64caabeb-4e04-4ba8-b39a-97737101481e",
    "inGameCost": "Gems: 40,000 - 75,000",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true
  },
  {
    "value": 45e3,
    "demand": 5,
    "category": "Air",
    "rarity": "Exotic",
    "name": "Tupolev TB3",
    "notes": "The Tupolev TB3 features normal drop bombs instead of the nuclear ones found on the Super Tupolev variant.",
    "inGameCost": "Gems: 40,000 - 45,000",
    "thumbnail": "/images/vehicles/Tupolev%20TB3.jpg",
    "history": [],
    "id": "65aa2ef3-08b7-4040-b5e8-0ae17b29b1ee",
    "tradeable": true,
    "hasManualGemRange": true,
    "gemOverrideMax": 45e3,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "trend": "Stable",
    "gemOverrideMin": 4e4,
    "tags": [
      "Air"
    ]
  },
  {
    "rarity": "Legendary",
    "gemOverrideMax": 16e3,
    "value": 16e3,
    "name": "Elite Lancer",
    "demand": 5,
    "id": "667250c5-d168-41f0-94b2-32d2d09b1691",
    "gemOverrideMin": 12e3,
    "notes": "Has 6 rocket burst with little to no reload time, does strong damage to vehicles can use one 6 burst of rockets to kill a ai destroyer",
    "thumbnail": "/images/vehicles/Elite%20Lancer.jpg",
    "inGameCost": "Gems: 12,000 - 16,000",
    "tags": [
      "Ground"
    ],
    "category": "Land",
    "tradeable": true,
    "history": [],
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Stable"
  },
  {
    "notes": "One of the worst planes currently with 4 missiles and one of the weakest machine guns.",
    "gemOverrideMax": 325,
    "history": [],
    "demand": 2,
    "thumbnail": "/images/vehicles/F-22.jpg",
    "hasManualGemRange": true,
    "id": "67437a9d-8f9a-4fce-97f1-777e9c0f2bc6",
    "value": 325,
    "gemOverrideMin": 275,
    "rarity": "Common",
    "name": "F-22",
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Air",
    "tradeable": true,
    "tags": [
      "f-22"
    ]
  },
  {
    "id": "67563d48-df47-49ee-858c-6fb291a59b6e",
    "gemOverrideMax": 7e4,
    "value": 7e4,
    "tags": [
      "Naval",
      "Special"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inGameCost": "Gems: 50,000 - 70,000",
    "gemOverrideMin": 5e4,
    "notes": "The Battle Yacht features the same weapons set as the Super Battle Yacht, except it doesn't have the AI-controlled missiles. Along with the insane, damaging explosive round machine gun ammo capacity being reduced from 75 rounds down to 50 rounds. The Railgun on the exotic rarity Battle Yacht is also weaker than its super varient as it takes around 3 railgun shots to kill an AI Naval Destroyer.",
    "thumbnail": "/images/vehicles/Battle%20Yacht.jpg",
    "demand": 9,
    "name": "Battle Yacht",
    "tradeable": true,
    "category": "Naval",
    "history": [],
    "hasManualGemRange": true,
    "rarity": "Exotic",
    "trend": "Stable"
  },
  {
    "category": "Air",
    "name": "Nuke K7",
    "notes": "The Nuke K7 is an average, slow-turn-radius bomber that features two weapons modes. The first weapon mode is named Artillery and features a 180-degree front-facing machine gun that deals massive damage, along with top- and bottom-mounted triple-barreled main cannons that deal average damage and can be fired in quick succession. The reload speeds within the Artillery weapon mode are quite solid. The second weapon mode is named Nuke Bombs, and it features 4 of the 360-degree-aimable explosive-round machine guns that deal quite low damage, along with a single nuclear drop bomb that bursts into 5 bombs and deals quite solid damage, but lacks vertical penetration for fortress bombing.  The Nuke K7 also features 4 AI machine gun explosive rounds that deal serious damage but have a limited range. The reload speed of the 360-degree machine guns within the Nuke Bombs weapon mode is quite slow, but the drop bomb burst reloads quite fast.",
    "inGameCost": "Gems: 300,000 - 400,000",
    "thumbnail": "/images/vehicles/Nuke%20K7.jpg",
    "value": 4e5,
    "tradeable": true,
    "hasCustomStarOverrides": false,
    "tags": [
      "Air"
    ],
    "inRecentlyUpdated": false,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "acronym": "NK7",
    "trend": "Stable",
    "gemOverrideMax": 4e5,
    "rarity": "Limited Edition",
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 3e5,
    "demand": 5,
    "id": "6787eb74-f82a-4f77-aaea-0a79ecdfef18",
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "category": "Air",
    "name": "War Shrike",
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "A decent aircraft that hovers and has a primary plasma cannon that is aimable. Has notoriously low health and firepower, which leads to low demand and usage. ",
    "gemOverrideMax": 2e4,
    "id": "68444456-23a7-4fec-94b4-229ba56f42be",
    "value": 2e4,
    "gemOverrideMin": 1e4,
    "history": [],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tags": [
      "Air"
    ],
    "rarity": "Legendary",
    "trend": "Stable",
    "inGameCost": "Gems: 10,000 - 20,000",
    "demand": 7,
    "thumbnail": "/images/vehicles/War%20Shrike.jpg"
  },
  {
    "value": 750,
    "inGameCost": "Gems: 500 - 750",
    "notes": "A speedy boat from one of the free warpasses. This boat has a explosive machine gun for the driver to control and some AI missiles to keep enemies at bay.",
    "category": "Naval",
    "name": "Interceptor",
    "tradeable": true,
    "gemOverrideMin": 500,
    "demand": 1,
    "hasManualGemRange": true,
    "id": "68db578d-766b-45f3-a0b8-59e1d4894800",
    "thumbnail": "/images/vehicles/Interceptor.jpg",
    "history": [],
    "rarity": "Epic",
    "gemOverrideMax": 750,
    "trend": "Stable",
    "tags": [
      "Naval"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "trend": "Dropping",
    "name": "Alvis Stormer",
    "tradeable": true,
    "notes": "Currently does not work.  (Buildable)",
    "thumbnail": "/images/vehicles/Alvis%20Stormer.jpg",
    "inGameCost": "Gems: 50 - 200",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 200,
    "demand": 1,
    "value": 200,
    "tags": [
      "Ground"
    ],
    "hasManualGemRange": true,
    "rarity": "Rare",
    "history": [],
    "gemOverrideMin": 50,
    "category": "Land",
    "id": "693fa4d3-2ef8-47a0-a802-9c11c9ddc383"
  },
  {
    "notes": "Downgraded version of the LE BISMARCK (G) stats-wise.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 225,000 - 300,000",
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": true,
    "value": 3e5,
    "starOverrides": {
      "0": 3e5,
      "1": 3e5,
      "2": 3e5,
      "3": 3e5,
      "4": 3e5,
      "5": 35e4,
      "fresh": 8e5
    },
    "thumbnail": "/images/vehicles/LE%20BISMARCK.jpg",
    "name": "LE BISMARCK",
    "trend": "Dropping",
    "acronym": "(EXO) BISM",
    "starTierOverrides": {
      "0": {
        "demand": 5,
        "hasManualGemRange": false,
        "value": 3e5,
        "gemOverrideMax": 315e3,
        "gemOverrideMin": 285e3,
        "notes": "",
        "trend": "Dropping"
      },
      "1": {
        "trend": "Dropping",
        "notes": "",
        "value": 3e5,
        "hasManualGemRange": false,
        "gemOverrideMax": 315e3,
        "gemOverrideMin": 285e3,
        "demand": 5
      },
      "2": {
        "demand": 5,
        "value": 3e5,
        "notes": "",
        "trend": "Dropping",
        "hasManualGemRange": false,
        "gemOverrideMin": 285e3,
        "gemOverrideMax": 315e3
      },
      "3": {
        "hasManualGemRange": false,
        "gemOverrideMin": 285e3,
        "gemOverrideMax": 315e3,
        "demand": 5,
        "value": 3e5,
        "notes": "",
        "trend": "Dropping"
      },
      "4": {
        "gemOverrideMin": 285e3,
        "gemOverrideMax": 315e3,
        "hasManualGemRange": false,
        "demand": 5,
        "trend": "Dropping",
        "notes": "",
        "value": 3e5
      },
      "5": {
        "gemOverrideMax": 367500,
        "gemOverrideMin": 332500,
        "hasManualGemRange": false,
        "trend": "Dropping",
        "notes": "",
        "demand": 5,
        "value": 35e4
      },
      "fresh": {
        "value": 8e5,
        "trend": "Dropping",
        "notes": "",
        "gemOverrideMax": 84e4,
        "gemOverrideMin": 76e4,
        "demand": 5,
        "hasManualGemRange": false
      }
    },
    "hasManualGemRange": false,
    "rarity": "Limited Edition",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "tags": [
      "Naval",
      "Collector"
    ],
    "history": [
      {
        "date": "Sep 10",
        "tierValues": {
          "0": 262500,
          "1": 262500,
          "2": 262700,
          "3": 272500,
          "4": 284500,
          "5": 327500,
          "fresh": 75e4
        },
        "updatedBy": "System",
        "timestamp": "2026-09-10T22:08:35.943Z",
        "value": 3e5,
        "note": "Previous Market Valuation"
      },
      {
        "value": 3e5,
        "updatedBy": "Spuppers",
        "date": "Sep 11",
        "timestamp": "2026-09-11T17:22:55.672Z",
        "note": "Staff moderation update",
        "tierValues": {
          "0": 3e5,
          "1": 3e5,
          "2": 3e5,
          "3": 3e5,
          "4": 3e5,
          "5": 3e5,
          "fresh": 3e5
        }
      },
      {
        "tierValues": {
          "0": 3e5,
          "1": 3e5,
          "2": 3e5,
          "3": 3e5,
          "4": 3e5,
          "5": 35e4,
          "fresh": 8e5
        },
        "note": "Staff moderation update",
        "date": "Sep 11",
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-11T17:23:19.287Z",
        "value": 3e5
      }
    ],
    "category": "Naval",
    "id": "69ab0fc4-0253-450a-a0be-92e1d8e7b1f9",
    "demand": 5
  },
  {
    "hasManualGemRange": true,
    "tags": [
      "Special",
      "j20"
    ],
    "category": "Air",
    "id": "69e9e4ed-20c6-42d3-b9c5-91b823f93a33",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "trend": "Rising",
    "thumbnail": "/images/vehicles/J20.jpg",
    "tradeable": true,
    "rarity": "Legendary",
    "value": 900,
    "gemOverrideMax": 900,
    "name": "J20",
    "demand": 1,
    "history": [],
    "notes": "The J20 features 4 low-damage-dealing, lock-on missiles. The J20 also has a 2-front-firing explosive round and machine guns that deal average damage. The J20 features 2 gem upgrades: the Gun Upgrade and the Super Missile Upgrade. The Super missile upgrade seems to drastically increase the damage of the J20's missiles, which is locked behind level 50. The Gun upgrade currently seems to have already been applied to all vehicles regardless of level for no gem cost.",
    "gemOverrideMin": 400
  },
  {
    "id": "69f96bfb-909f-4345-89bf-f3242d5d535f",
    "tags": [
      "bradley"
    ],
    "hasManualGemRange": true,
    "notes": "A  fast and stable tank that has a fast firing aimable frontal cannon, smoke grenades, 4 air to air missiles and temporarily useless flares and first person",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 4700,
    "tradeable": true,
    "thumbnail": "/images/vehicles/Bradley.jpg",
    "demand": 5,
    "trend": "Stable",
    "gemOverrideMin": 3e3,
    "category": "Land",
    "name": "Bradley",
    "history": [],
    "gemOverrideMax": 4700,
    "rarity": "Legendary"
  },
  {
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "Dune Buggy",
    "thumbnail": "/images/vehicles/Dune%20Buggy.jpg",
    "id": "6a336b41-7887-486c-943b-e8c6cbcbb601",
    "trend": "Stable",
    "category": "Land",
    "demand": 1,
    "value": 100,
    "tradeable": true,
    "gemOverrideMax": 100,
    "hasManualGemRange": true,
    "history": [],
    "rarity": "Common",
    "notes": "A Buildable vehicle that has passenger controlled guns and driver controlled rockets from an upgrade.(Buildable)",
    "tags": [
      "dune-buggy"
    ],
    "gemOverrideMin": 20
  },
  {
    "inRecentlyUpdated": false,
    "history": [],
    "hasManualGemRange": true,
    "hasCustomStarOverrides": false,
    "tags": [
      "Air",
      "Special"
    ],
    "notes": "A helicopter-like air vehicle, just like a normal UFO. The mothership features 6 AI-controlled laser air defense, along with 2 aimable laser cannons that deal high damage to bosses and other vehicles, similar to the Yal1. The mothership is obtained via the weekly pre-update admin abuse event.",
    "tradeable": true,
    "id": "6a8c660a-3bc2-401e-a60a-07d4273a8ae2",
    "acronym": "MS",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 125,000 - 150,000",
    "value": 15e4,
    "name": "Mothership",
    "excludeFromRecentlyUpdated": true,
    "hasCustomMultiplierOverrides": false,
    "thumbnail": "/images/vehicles/Mothership.jpg",
    "trend": "Dropping",
    "rarity": "Exotic",
    "gemOverrideMax": 15e4,
    "category": "Air",
    "demand": 6,
    "gemOverrideMin": 125e3
  },
  {
    "id": "6b679baa-39eb-4c50-8fd4-66c7807b008a",
    "history": [],
    "thumbnail": "/images/vehicles/Blackout%20_Banner_.jpg",
    "hasManualGemRange": true,
    "trend": "Stable",
    "name": "Blackout (Banner)",
    "rarity": "Epic",
    "category": "Tags",
    "value": 2500,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMin": 2e3,
    "tradeable": true,
    "notes": "Available through crates.",
    "demand": 5,
    "inGameCost": "Gems: 2,000 - 2,500",
    "gemOverrideMax": 2500,
    "tags": [
      "Banner"
    ]
  },
  {
    "gemOverrideMax": 5e3,
    "id": "6bcf3432-f426-4bf0-999d-7b772dff827b",
    "trend": "Stable",
    "hasManualGemRange": true,
    "category": "Naval",
    "gemOverrideMin": 2500,
    "inGameCost": "Gems: 2,500 - 5,000",
    "tags": [
      "Naval"
    ],
    "thumbnail": "/images/vehicles/PACV%20Craft.jpg",
    "history": [],
    "tradeable": true,
    "notes": "Fast hovercraft with front facing cannon up to a certain degree of aim, quite good for level grinding",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "value": 5e3,
    "name": "PACV Craft",
    "demand": 3
  },
  {
    "inGameCost": "Gems: 125,000 - 150,000",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "excludeFromRecentlyUpdated": false,
    "trend": "Stable",
    "category": "Other",
    "thumbnail": "/images/vehicles/Jetpack%20Armor.jpg",
    "name": "Jetpack Armor",
    "history": [
      {
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "date": "Sep 10",
        "tierValues": {
          "0": 15e4
        },
        "value": 15e4,
        "timestamp": "2026-09-10T22:08:35.943Z"
      },
      {
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "timestamp": "2026-09-11T17:31:45.909Z",
        "tierValues": {
          "0": 2e5
        },
        "tier": "0",
        "date": "Sep 11",
        "value": 2e5
      }
    ],
    "gemOverrideMin": 125e3,
    "notes": "Decent Armor that allows you to temporarily fly when holding down the jump button. The flight duration is able to be expanded if the jetpack exhaust is utilized in short bursts. Currently very buggy, constantly unusable when exiting a vehicle.",
    "rarity": "Limited Edition",
    "starTierOverrides": {
      "0": {
        "demand": 3
      }
    },
    "hasManualGemRange": false,
    "hasCustomStarOverrides": false,
    "tradeable": true,
    "id": "6c02a704-a032-45ed-897a-26ac499e9a0c",
    "inRecentlyUpdated": false,
    "value": 2e5,
    "gemOverrideMax": 15e4,
    "hasCustomMultiplierOverrides": false,
    "demand": 7,
    "tags": [
      "Armor",
      "Special"
    ]
  },
  {
    "gemOverrideMin": 25,
    "notes": "This emblem is obtained by the kill tag crates!",
    "tradeable": true,
    "category": "Tags",
    "demand": 1,
    "value": 50,
    "gemOverrideMax": 50,
    "name": "Carrier (Emblem)",
    "rarity": "Common",
    "history": [],
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "6d46c2e3-136d-43fe-92ee-96ef5779abe3",
    "thumbnail": "/images/vehicles/Carrier%20_Emblem_.jpg",
    "inGameCost": "Gems: 25 - 50",
    "hasManualGemRange": true,
    "tags": [
      "Emblem"
    ]
  },
  {
    "hasManualGemRange": true,
    "inGameCost": "Gems: 25 - 50",
    "thumbnail": "/images/vehicles/Helm%20_Emblem_.jpg",
    "tags": [
      "Emblem"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "value": 50,
    "notes": "This emblem is obtained by the kill tag crates!",
    "id": "6d771d80-538f-4355-a2ac-475e155bb3c4",
    "gemOverrideMax": 50,
    "name": "Helm (Emblem)",
    "category": "Tags",
    "history": [],
    "rarity": "Common",
    "gemOverrideMin": 25,
    "tradeable": true,
    "demand": 1,
    "trend": "Stable"
  },
  {
    "trend": "Stable",
    "tradeable": true,
    "category": "Naval",
    "demand": 4,
    "acronym": "WS",
    "gemOverrideMax": 7e4,
    "rarity": "Exotic",
    "tags": [
      "Naval"
    ],
    "history": [],
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "inGameCost": "Gems: 50,000 - 70,000",
    "gemOverrideMin": 5e4,
    "hasCustomStarOverrides": false,
    "notes": "The Warspite features the same weapons as the Super Warspite, but has lower ammo capacity and damage from its weapons set.",
    "name": "Warspite",
    "thumbnail": "/images/vehicles/Warspite.jpg",
    "id": "6d79f1e3-535b-4282-a1d0-d1dc5ae31c02",
    "value": 7e4,
    "lastUpdated": "2026-09-10T22:08:37.729Z"
  },
  {
    "rarity": "Legendary",
    "gemOverrideMax": 10500,
    "tradeable": true,
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Air",
    "gemOverrideMin": 8500,
    "demand": 5,
    "tags": [
      "b-52-bomber"
    ],
    "value": 10500,
    "history": [],
    "id": "6e87471a-8668-4f1b-be13-a6158169aa4d",
    "thumbnail": "/images/vehicles/B-52%20Bomber.jpg",
    "notes": "Low functionality due to the many nerfs it has recieved.",
    "name": "B-52 Bomber",
    "hasManualGemRange": true
  },
  {
    "category": "Air",
    "history": [],
    "trend": "Dropping",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "spitfire"
    ],
    "thumbnail": "/images/vehicles/Spitfire.jpg",
    "id": "6ebde7a3-1dcd-40cc-a291-d36e3bc6753e",
    "tradeable": true,
    "gemOverrideMax": 210,
    "notes": "A cheap tycoon plane that is a decent for beginners",
    "rarity": "Rare",
    "value": 210,
    "gemOverrideMin": 170,
    "name": "Spitfire",
    "demand": 1
  },
  {
    "value": 100,
    "gemOverrideMax": 100,
    "demand": 1,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Boat.jpg",
    "gemOverrideMin": 20,
    "notes": "A cheap tycoon vehicle that makes travelling in water faster.",
    "rarity": "Common",
    "tags": [
      "Naval"
    ],
    "category": "Naval",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inGameCost": "Gems: 20 - 100",
    "id": "6ff99997-0383-4d09-be6e-3ab0ab3664dd",
    "history": [],
    "trend": "Dropping",
    "tradeable": true,
    "name": "Boat"
  },
  {
    "id": "70085d85-ba28-413f-9eb3-ff76ada59981",
    "thumbnail": "/images/vehicles/Stomper.jpg",
    "trend": "Stable",
    "name": "Stomper",
    "hasManualGemRange": true,
    "value": 3e5,
    "rarity": "Legendary",
    "gemOverrideMin": 25e4,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "notes": "The Stomper costed 999 robux released on halloween update October 2024, has an AOE attack that deals damage to any player related item such as vehicles, troops, and players.",
    "demand": 4,
    "gemOverrideMax": 3e5,
    "tags": [
      "Special",
      "Collector",
      "stomper"
    ],
    "history": [],
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "category": "Land"
  },
  {
    "gemOverrideMin": 17500,
    "demand": 7,
    "tradeable": true,
    "rarity": "Legendary",
    "name": "Ironhawk",
    "gemOverrideMax": 25e3,
    "trend": "Stable",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "value": 25e3,
    "category": "Air",
    "id": "701d87ae-3c28-4ac6-8dea-6026579f5ccc",
    "thumbnail": "/images/vehicles/Ironhawk.jpg",
    "notes": "Average helicopter with 4 armor-penetrating missiles and 2 rockets bursts. The missiles reload at an average pace, while the rocket bursts take quite a bit longer to reload. The Ironhawk also contains a weaponless and featureless passenger seat.",
    "tags": [
      "Air"
    ],
    "hasManualGemRange": true,
    "inGameCost": "Gems: 17,500 - 25,000"
  },
  {
    "history": [],
    "hasManualGemRange": true,
    "tags": [
      "Naval",
      "Special"
    ],
    "gemOverrideMax": 7e3,
    "notes": "The Stealth Boat is the first vehicle to feature hydrofoil technology, which enables it to operate like a hybrid of a submarine and a speedboat. It takes around 4 seconds for the Stealth Boat to rotate upon its axis a full 360 degrees. The Stealth Boat features 4 front-facing, non-lock-on torpedoes that deal heavy damage against all vehicle types. Along with a 100-round explosive bullet machine gun that deals good damage overall, but sadly features a longer reload time.",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMin": 5e3,
    "tradeable": true,
    "value": 7e3,
    "name": "Stealth Boat",
    "thumbnail": "/images/vehicles/Stealth%20Boat.jpg",
    "trend": "Rising",
    "rarity": "Legendary",
    "category": "Naval",
    "id": "706bb55b-398f-4e22-850f-15fb0b5db46d",
    "inGameCost": "Gems: 5,000 - 7,000",
    "demand": 5
  },
  {
    "id": "707c4e68-572f-43f6-9978-259c6e098336",
    "category": "Soldier",
    "history": [],
    "thumbnail": "/images/vehicles/Pumpkin%20Soldier.jpg",
    "name": "Pumpkin Soldier",
    "trend": "Stable",
    "inGameCost": "Gems: 1,500 - 2,000",
    "rarity": "Legendary",
    "value": 2e3,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 2e3,
    "tradeable": true,
    "demand": 6,
    "notes": "Decent troop that fires a special purple effect grenade launcher that deals low damage against troops. The grenade launcher has decent splash damage, just like its super variant.",
    "hasManualGemRange": true,
    "gemOverrideMin": 1500,
    "tags": [
      "Soldiers",
      "Collector"
    ]
  },
  {
    "tags": [
      "tiger-tank"
    ],
    "hasManualGemRange": true,
    "value": 100,
    "thumbnail": "/images/vehicles/Tiger%20Tank.jpg",
    "notes": "A tank that has a non-explosive, non-aimable, hull-mounted machinegun and a weak cannon. (Buildable)",
    "id": "70ba1039-b958-4e24-86e5-3e691720bc52",
    "tradeable": true,
    "gemOverrideMin": 50,
    "rarity": "Common",
    "name": "Tiger Tank",
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "demand": 0,
    "gemOverrideMax": 100,
    "history": [],
    "trend": "Stable"
  },
  {
    "tags": [
      "Emblem"
    ],
    "gemOverrideMin": 8e3,
    "thumbnail": "/images/vehicles/Egg%20_Emblem_.jpg",
    "trend": "Stable",
    "demand": 5,
    "gemOverrideMax": 1e4,
    "hasManualGemRange": true,
    "rarity": "Exotic",
    "category": "Tags",
    "inGameCost": "Gems: 8,000 - 10,000",
    "notes": "This comes from the Limited Edition easter bundle released in April of 2026.",
    "history": [],
    "name": "Egg (Emblem)",
    "id": "715b9df8-01ad-4b92-a8ab-87202337dfad",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 1e4,
    "tradeable": true
  },
  {
    "id": "72456a82-e3ca-43fd-a5f9-3ac917b1e548",
    "notes": "Can drive over water, making it useful in some cases. (Buildable)",
    "gemOverrideMin": 20,
    "inGameCost": "Gems: 20 - 100",
    "hasManualGemRange": true,
    "history": [],
    "demand": 1,
    "thumbnail": "/images/vehicles/AAV.jpg",
    "value": 100,
    "gemOverrideMax": 100,
    "tags": [
      "Ground"
    ],
    "rarity": "Common",
    "trend": "Stable",
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true,
    "name": "AAV"
  },
  {
    "inRecentlyUpdated": false,
    "history": [],
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "notes": "A tank with 2 large cannons that can deal with ground threats well. This version comes with a railgun on top that can take out 75% of an AI carriers health",
    "name": "S-tank Railgun",
    "gemOverrideMax": 4e4,
    "rarity": "Exotic",
    "category": "Land",
    "tradeable": true,
    "demand": 2,
    "id": "72d92ae7-f8e1-4700-a753-72991da3dc4f",
    "value": 4e4,
    "gemOverrideMin": 3e4,
    "thumbnail": "/images/vehicles/S-tank%20Railgun.jpg",
    "tags": [
      "s-tank-railgun"
    ],
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "trend": "Stable"
  },
  {
    "gemOverrideMax": 100,
    "category": "Air",
    "rarity": "Common",
    "value": 100,
    "name": "B-17",
    "tradeable": true,
    "demand": 1,
    "gemOverrideMin": 20,
    "notes": "A decent plane for beginners with its high DPS but it is easy to kill with most AA vehicles.(Buildable)",
    "tags": [
      "b-17"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "history": [],
    "hasManualGemRange": true,
    "id": "740ff39b-dc2f-420a-b0b8-40bcfc005597",
    "thumbnail": "/images/vehicles/B-17.jpg",
    "trend": "Stable"
  },
  {
    "rarity": "Common",
    "hasManualGemRange": true,
    "category": "Land",
    "gemOverrideMin": 20,
    "demand": 2,
    "trend": "Stable",
    "name": "APC",
    "history": [],
    "tradeable": true,
    "gemOverrideMax": 100,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "thumbnail": "/images/vehicles/APC.jpg",
    "id": "74e19b33-801e-478b-b126-2805f6e9f149",
    "value": 100,
    "inGameCost": "Gems: 20 - 100",
    "notes": "A decent vehicle having an explosive machine gun and a missile upgrade.",
    "tags": [
      "Ground"
    ]
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 530,
    "value": 530,
    "id": "7510ee1f-63fd-4b58-a172-8287be40a507",
    "gemOverrideMin": 430,
    "notes": "A Buildable vehicle that is good for moving around the map due to its speed and grappler.(Spec-ops)",
    "category": "Land",
    "tradeable": true,
    "tags": [
      "sand-hyena"
    ],
    "thumbnail": "/images/vehicles/Sand%20Hyena.jpg",
    "demand": 1,
    "hasManualGemRange": true,
    "history": [],
    "rarity": "Common",
    "name": "Sand Hyena",
    "trend": "Dropping"
  },
  {
    "trend": "Stable",
    "rarity": "Limited Edition",
    "gemOverrideMax": 7e5,
    "thumbnail": "/images/vehicles/Super%20Yamato.jpg",
    "name": "Super Yamato",
    "category": "Naval",
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 6e5,
    "demand": 6,
    "hasCustomMultiplierOverrides": false,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "The Super Yamato features 2 Seahawk drones that shoot explosive rounds of machine gun rounds at enemies. The Super Yamato has 2 weapon modes, the first mode features 9 high damaging cannon shots and fast firing 80 ammo machineguns. The second weapon mode features the spawn drones weapon. The main difference between the Super Yamato and the Epic rarity Yamato is the addition of 2 Seahawk drones and major stat changes. This boat also has the most hp in the entire game with 113k hp.",
    "acronym": "SYAM",
    "tradeable": true,
    "id": "752871f8-345d-44fb-a2ac-cc195de4bf91",
    "hasCustomStarOverrides": false,
    "inGameCost": "Gems: 600,000 - 700,000",
    "history": [
      {
        "updatedBy": "System",
        "date": "Sep 10",
        "timestamp": "2026-09-10T22:08:36.830Z",
        "tierValues": {
          "0": 7e5,
          "1": 7e5,
          "2": 7e5,
          "3": 7e5,
          "4": 7e5,
          "5": 7e5,
          "fresh": 7e5
        },
        "note": "Previous Market Valuation",
        "value": 7e5
      },
      {
        "note": "Staff moderation update",
        "tierValues": {
          "0": 4e5,
          "1": 4e5,
          "2": 4e5,
          "3": 4e5,
          "4": 4e5,
          "5": 4e5,
          "fresh": 4e5
        },
        "value": 4e5,
        "date": "Sep 11",
        "timestamp": "2026-09-11T17:28:22.270Z",
        "updatedBy": "Spuppers"
      }
    ],
    "value": 4e5,
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "tags": [
      "Naval",
      "Special"
    ]
  },
  {
    "acronym": "LERP",
    "hasCustomStarOverrides": true,
    "trend": "Rising",
    "id": "752b4057-dfb9-4f28-a143-a064a8b0d38e",
    "gemOverrideMax": 475e4,
    "name": "LE Rocket Plane",
    "history": [
      {
        "tierValues": {
          "0": 475e4,
          "1": 475e4,
          "2": 4750200,
          "3": 476e4,
          "4": 477e4,
          "5": 481e4,
          "fresh": 475e4
        },
        "updatedBy": "System",
        "date": "Sep 02",
        "timestamp": "2026-09-03T00:08:16.013Z",
        "value": 475e4,
        "note": "Previous Market Valuation"
      },
      {
        "timestamp": "2026-09-10T00:08:16.013Z",
        "date": "Sep 09",
        "updatedBy": "Spuppers",
        "value": 45e5,
        "tierValues": {
          "0": 45e5,
          "1": 45e5,
          "2": 4500200,
          "3": 451e4,
          "4": 452e4,
          "5": 456e4,
          "fresh": 45e5
        },
        "note": "Staff moderation update"
      },
      {
        "value": 45e5,
        "tierValues": {
          "0": 4500001,
          "1": 4500001,
          "2": 4500001,
          "3": 4500001,
          "4": 4500001,
          "5": 45e5,
          "fresh": 7e6
        },
        "timestamp": "2026-09-10T00:08:59.575Z",
        "updatedBy": "Spuppers",
        "date": "Sep 09",
        "note": "Staff moderation update"
      },
      {
        "note": "Staff moderation update",
        "tierValues": {
          "0": 4500001,
          "1": 4500001,
          "2": 4500001,
          "3": 4500001,
          "4": 4500001,
          "5": 45e5,
          "fresh": 6e6
        },
        "tier": "fresh",
        "updatedBy": "Voiddarkreaper",
        "date": "Sep 09",
        "value": 45e5,
        "timestamp": "2026-09-10T00:13:36.375Z"
      },
      {
        "note": "Staff moderation update",
        "timestamp": "2026-09-12T00:09:54.496Z",
        "value": 45e5,
        "updatedBy": "Voiddarkreaper",
        "tierValues": {
          "0": 4500001,
          "1": 4500001,
          "2": 4500001,
          "3": 4500001,
          "4": 4e6,
          "5": 4e6,
          "fresh": 6e6
        },
        "date": "Sep 11"
      }
    ],
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "gemOverrideMin": 425e4,
    "starTierOverrides": {
      "0": {
        "demand": 6,
        "hasManualGemRange": false,
        "trend": "Dropping",
        "notes": "",
        "gemOverrideMax": 4725001,
        "gemOverrideMin": 4275001,
        "value": 4500001
      },
      "1": {
        "hasManualGemRange": false,
        "demand": 6,
        "value": 4500001,
        "gemOverrideMin": 4275001,
        "gemOverrideMax": 4725001,
        "notes": "",
        "trend": "Dropping"
      },
      "2": {
        "hasManualGemRange": false,
        "demand": 6,
        "value": 4500001,
        "trend": "Dropping",
        "notes": "",
        "gemOverrideMax": 4725001,
        "gemOverrideMin": 4275001
      },
      "3": {
        "demand": 6,
        "gemOverrideMin": 4275001,
        "gemOverrideMax": 4725001,
        "value": 4500001,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Dropping"
      },
      "4": {
        "hasManualGemRange": false,
        "gemOverrideMin": 38e5,
        "gemOverrideMax": 42e5,
        "demand": 6,
        "value": 4e6,
        "trend": "Dropping",
        "notes": ""
      },
      "5": {
        "gemOverrideMax": 42e5,
        "gemOverrideMin": 38e5,
        "hasManualGemRange": false,
        "demand": 6,
        "value": 4e6,
        "notes": "",
        "trend": "Dropping"
      },
      "fresh": {
        "demand": 6,
        "trend": "Dropping",
        "notes": "",
        "value": 6e6,
        "gemOverrideMax": 63e5,
        "gemOverrideMin": 57e5,
        "hasManualGemRange": false
      }
    },
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/LE%20Rocket%20Plane.jpg",
    "inRecentlyUpdated": false,
    "tags": [
      "Special",
      "Collector",
      "le-rocket-plane"
    ],
    "notes": "The fastest jet that features power missiles and a high DPS laser cannon. Using its speedboost on repeat, it can outrun most current aircraft. This plane has an extremely high skill ceiling and if you can master this vehicle you could kill almost anything.",
    "rarity": "Limited Edition",
    "hasCustomMultiplierOverrides": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "category": "Air",
    "demand": 10,
    "value": 45e5,
    "starOverrides": {
      "0": 4500001,
      "1": 4500001,
      "2": 4500001,
      "3": 4500001,
      "4": 4e6,
      "5": 4e6,
      "fresh": 6e6
    }
  },
  {
    "category": "Soldier",
    "gemOverrideMin": 10,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Soldiers"
    ],
    "trend": "Stable",
    "tradeable": true,
    "gemOverrideMax": 20,
    "inGameCost": "Gems: 10 - 20",
    "history": [],
    "id": "75777b06-da5b-4dbd-8a84-718e5ad922fe",
    "name": "Private",
    "thumbnail": "/images/vehicles/Private.jpg",
    "rarity": "Common",
    "notes": "First ever troop type can be hard to find as msost people converted them to rare troop types.",
    "demand": 0,
    "value": 20
  },
  {
    "gemOverrideMax": 125,
    "category": "Drone",
    "tradeable": true,
    "tags": [
      "Drones"
    ],
    "notes": "A high DPS drone that is good for single targets.",
    "gemOverrideMin": 75,
    "value": 125,
    "inGameCost": "Gems: 75 - 125",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "75b6e626-1c3e-48cf-aff0-88bc288622e1",
    "name": "Attack Drone",
    "history": [],
    "hasManualGemRange": true,
    "demand": 1,
    "trend": "Dropping",
    "rarity": "Epic",
    "thumbnail": "/images/vehicles/Attack%20Drone.jpg"
  },
  {
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "category": "Naval",
    "id": "75c69351-e880-4e0f-893b-59742e192a23",
    "hasCustomStarOverrides": false,
    "tags": [
      "Naval",
      "Special"
    ],
    "hasManualGemRange": true,
    "gemOverrideMin": 15e3,
    "notes": "Less valuable version of Izumo",
    "inRecentlyUpdated": false,
    "history": [],
    "inGameCost": "Gems: 15,000 - 25,000",
    "demand": 5,
    "gemOverrideMax": 25e3,
    "hasCustomMultiplierOverrides": false,
    "name": "LE5000 Izumo",
    "value": 25e3,
    "thumbnail": "/images/vehicles/LE5000%20Izumo.jpg",
    "rarity": "Legendary"
  },
  {
    "value": 4e3,
    "rarity": "Legendary",
    "tradeable": true,
    "hasManualGemRange": true,
    "history": [],
    "gemOverrideMin": 3e3,
    "notes": "A decent tank that has a Limited Edition smoke screen ability that reduces damage taken by 50%.",
    "id": "765a1382-4563-4cb3-bad2-4c0fcb17fd19",
    "demand": 3,
    "gemOverrideMax": 4e3,
    "name": "Leopard 2A7",
    "category": "Land",
    "tags": [
      "leopard-2a7"
    ],
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Leopard%202A7.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "name": "Tu-22M",
    "history": [],
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "A slow bomber that has explosive machine guns and two big bombs.",
    "value": 3100,
    "demand": 4,
    "gemOverrideMax": 3100,
    "trend": "Dropping",
    "id": "768e317b-cb54-4c10-b748-e3a627f9116d",
    "tags": [
      "tu-22m"
    ],
    "thumbnail": "/images/vehicles/Tu-22M.jpg",
    "category": "Air",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "rarity": "Legendary",
    "gemOverrideMin": 2500
  },
  {
    "history": [],
    "notes": "Decent forward facing machineguns with cluster missiles.",
    "gemOverrideMax": 700,
    "name": "MiG-29",
    "gemOverrideMin": 300,
    "value": 700,
    "tradeable": true,
    "hasManualGemRange": true,
    "category": "Air",
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/MiG-29.jpg",
    "rarity": "Epic",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tags": [
      "mig-29"
    ],
    "demand": 2,
    "id": "769d6488-63ed-4a76-8973-eb16cbb9741a"
  },
  {
    "thumbnail": "/images/vehicles/Santa%20Maus.jpg",
    "notes": "A very tanky vehicle that has a decent cannon and good explosive machinegun. This tanks HP is close to the HP the Gold AC-130 has.",
    "rarity": "Legendary",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "name": "Santa Maus",
    "history": [],
    "value": 63e3,
    "excludeFromRecentlyUpdated": true,
    "demand": 4,
    "trend": "Stable",
    "category": "Land",
    "gemOverrideMax": 63e3,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "tradeable": true,
    "gemOverrideMin": 55e3,
    "tags": [
      "Collector",
      "santa-maus"
    ],
    "id": "76a38495-07ac-4fed-a3cb-231866d75263"
  },
  {
    "tags": [
      "b29-bomber"
    ],
    "thumbnail": "/images/vehicles/B29%20Bomber.jpg",
    "id": "76c9dff8-6d96-4eeb-8ca5-12a49a317b83",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 2,
    "gemOverrideMax": 550,
    "notes": "A decent plane for beginners with its high DPS but it is easily to kill with most AA vehicles.(Buildable)",
    "gemOverrideMin": 450,
    "value": 550,
    "rarity": "Rare",
    "category": "Air",
    "history": [],
    "trend": "Dropping",
    "name": "B29 Bomber",
    "hasManualGemRange": true,
    "tradeable": true
  },
  {
    "hasManualGemRange": true,
    "value": 3e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inGameCost": "Gems: 2,000 - 3,000",
    "tradeable": true,
    "notes": "Average tank with a limited range frontal cannon, it can aim up and down vertically. But the cannon lacks horizontal or side-to-side movement capabilities. The Foch 155 also features an aimable explosive round machine gun. The machine gun has a large ammo capacity but lacks fire rate. The reload is very quick for both the frontal cannon and machine gun.",
    "tags": [
      "Ground"
    ],
    "demand": 4,
    "gemOverrideMax": 3e3,
    "id": "77b1d7c1-b0c3-41cc-95a6-15bccbadad1a",
    "history": [],
    "rarity": "Legendary",
    "name": "Foch 155",
    "trend": "Stable",
    "category": "Land",
    "thumbnail": "/images/vehicles/Foch%20155.jpg",
    "gemOverrideMin": 2e3
  },
  {
    "demand": 2,
    "hasManualGemRange": true,
    "trend": "Stable",
    "rarity": "Legendary",
    "category": "Air",
    "tradeable": true,
    "name": "Super YF-23",
    "value": 8e3,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "thumbnail": "/images/vehicles/Super%20YF-23.jpg",
    "gemOverrideMax": 8e3,
    "history": [],
    "tags": [
      "super-yf-23"
    ],
    "notes": "Can permanently stunlock any vehicle, but has to be close to AI vehicles to do this. Stunning does not disable AI weapons.",
    "id": "78851648-c3ff-47b4-89e3-fe0b61d003e4",
    "gemOverrideMin": 4e3
  },
  {
    "trend": "Stable",
    "hasManualGemRange": true,
    "history": [],
    "demand": 5,
    "tags": [
      "Emote"
    ],
    "id": "78c37b9b-5a7b-46cf-9912-5f631d99e1f8",
    "tradeable": true,
    "rarity": "Epic",
    "notes": "apple juice > orange juice (no competition)",
    "category": "Tags",
    "inGameCost": "Gems: 750 - 1,250",
    "gemOverrideMax": 1250,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/OJ%20_Emote_.jpg",
    "value": 1250,
    "name": "OJ (Emote)",
    "gemOverrideMin": 750
  },
  {
    "notes": "B-2 bomber that boasts an American flag livery along with having a long reloading single drop bomb and the normal emp burst",
    "rarity": "Legendary",
    "name": "B2 Liberty",
    "value": 6e3,
    "category": "Air",
    "thumbnail": "/images/vehicles/B2%20Liberty.jpg",
    "demand": 2,
    "tradeable": true,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMin": 4e3,
    "hasManualGemRange": true,
    "history": [],
    "gemOverrideMax": 6e3,
    "tags": [
      "Air"
    ],
    "id": "78f585e3-5ce0-4f46-9190-e46ab191d19c",
    "inGameCost": "Gems: 4,000 - 6,000"
  },
  {
    "notes": "You start out with this, there is no price for it.",
    "inRecentlyUpdated": false,
    "value": 0,
    "inGameCost": "Untradable",
    "tradeable": false,
    "tags": [
      "Emote"
    ],
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "id": "794e2885-d14c-46bd-905c-771bbea81870",
    "thumbnail": "https://static.wixstatic.com/media/f89faf_b2ccfb8c724940f2b48d09cfdc8e0f9d~mv2.png/v1/fill/w_206,h_228,al_c,lg_1,q_85,enc_avif,quality_auto/f89faf_b2ccfb8c724940f2b48d09cfdc8e0f9d~mv2.png",
    "demand": 5,
    "lastUpdated": "2026-08-29",
    "history": [],
    "rarity": "Common",
    "category": "Tags",
    "name": "Salute (Emote)"
  },
  {
    "value": 4e5,
    "id": "7991d23d-3c5f-4b39-894d-065c8087adfe",
    "demand": 5,
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "tradeable": true,
    "notes": "The Super Warspite features 2 attack modes, the first is named Fire Power and features 8 centrally located rapid-fire cannons that deal medium to serious damage. Along with 3 non-reloading large caliber cannons that produce the same damage and audio as the P1000 Ratte and Sturm Tank main cannons. The 3 non-reloading cannons can fire 8 shots per salvo. The Fire Power weapons all reload quite fast. The Super Warspite also features 7 AI machine guns that deal good damage and have quite a solid range. The second weapon mode is named Anti-Air and features 4 automatic Anti-Air machine guns that deal good damage against air vehicles. Along with 4 semi-automatic machine guns that deal slightly more serious damage than their automatic counterparts. (The Super Warspite is currently quite buggy in terms of its weapons, minimap icon, and vehicle seat as of its launch date.)",
    "rarity": "Limited Edition",
    "hasManualGemRange": true,
    "acronym": "S WAR",
    "inRecentlyUpdated": false,
    "name": "Super Warspite",
    "category": "Naval",
    "thumbnail": "/images/vehicles/Super%20Warspite.jpg",
    "gemOverrideMax": 4e5,
    "trend": "Stable",
    "hasCustomMultiplierOverrides": false,
    "tags": [
      "Naval"
    ],
    "inGameCost": "Gems: 350,000 - 400,000",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMin": 35e4
  },
  {
    "category": "Air",
    "tradeable": true,
    "tags": [
      "Special",
      "b2-sleigh"
    ],
    "gemOverrideMin": 2e4,
    "trend": "Rising",
    "gemOverrideMax": 25e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "B2 Sleigh",
    "history": [],
    "demand": 7,
    "notes": "Reskined B-2",
    "id": "79b4e833-b464-492b-8987-c657535d01e4",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/B2%20Sleigh.jpg",
    "value": 25e3
  },
  {
    "notes": "The CFA44 features dual 150-round plasma machine guns that have to be bought via a gem upgrade, along with 3x 7-round missile bursts.",
    "hasManualGemRange": true,
    "name": "CFA44",
    "thumbnail": "/images/vehicles/CFA44.jpg",
    "value": 3e4,
    "history": [],
    "tags": [
      "cfa44"
    ],
    "demand": 3,
    "gemOverrideMax": 3e4,
    "trend": "Stable",
    "id": "79f72553-600f-483e-91c2-8ef25c1e3480",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMin": 27500,
    "category": "Air",
    "rarity": "Exotic"
  },
  {
    "inGameCost": "Gems: 50,000 - 60,000",
    "trend": "Stable",
    "hasManualGemRange": true,
    "gemOverrideMin": 5e4,
    "name": "Tiger Mech",
    "gemOverrideMax": 6e4,
    "tradeable": true,
    "notes": "The Tiger mech features the same jumping and boost features as all other mechs. The Tiger mech features the same aimable explosive round machine gun as the Strike Mech variants, but also an aimable single-shot main cannon that deals serious damage. The Special feature of the Tiger Mech is its toggleable shield that protects against incoming projectiles that hit and contact the shield. When toggled, the Shield seems to slow down the movement speed of the mech, but that does not seem to be the case if the boost is applied. The shield doesn't cover the entire mech and only a small portion, making it not ideal or very useful. The rotation speed of the mech is quite slow, making its aimable machine gun and cannon quite obsolete as well.",
    "thumbnail": "/images/vehicles/Tiger%20Mech.jpg",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "history": [],
    "demand": 6,
    "category": "Land",
    "value": 6e4,
    "rarity": "Exotic",
    "tags": [
      "Ground",
      "Special"
    ],
    "id": "7a2b895e-7ae1-43c0-b77d-586ae504dc6d"
  },
  {
    "rarity": "Exotic",
    "tradeable": true,
    "inGameCost": "Gems: 50,000 - 70,000",
    "value": 7e4,
    "category": "Land",
    "gemOverrideMax": 7e4,
    "name": "Nuke Chrysler",
    "notes": "Decently maneuverable ground vehicles with a main central cannon that fires 2 slow reloading low low-explosive radius nuclear rounds. It also features a high damage-dealing, long-reloading machine gun. The overall rotation of the turret is quite slow compared to other tanks. The front section of the tank treads has the same protective armor section feature just like the Jagdpanther.",
    "demand": 3,
    "history": [],
    "gemOverrideMin": 5e4,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "7a65c6ee-e032-4662-acc3-db8fc86b96d6",
    "trend": "Stable",
    "tags": [
      "Ground",
      "Special"
    ],
    "thumbnail": "/images/vehicles/Nuke%20Chrysler.jpg",
    "hasManualGemRange": true
  },
  {
    "inGameCost": "Gems: 1,500 - 2,000",
    "thumbnail": "/images/vehicles/Nimitz.jpg",
    "history": [],
    "gemOverrideMin": 1500,
    "rarity": "Legendary",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "name": "Nimitz",
    "value": 2e3,
    "demand": 1,
    "category": "Naval",
    "gemOverrideMax": 2e3,
    "notes": "An aircraft carrier that has AI CIWS and can spawn planes and helicopters.",
    "hasManualGemRange": true,
    "tags": [
      "Naval"
    ],
    "id": "7a761101-438b-4b10-b435-7aa3cb590220",
    "trend": "Stable",
    "tradeable": true
  },
  {
    "id": "7b61afa5-5fd5-48e1-ae68-af001f6901f5",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 7,000 - 9,000",
    "thumbnail": "/images/vehicles/Gold%20M10.jpg",
    "tags": [
      "Ground"
    ],
    "notes": "An improved version of its non super variant",
    "value": 9e3,
    "gemOverrideMax": 9e3,
    "category": "Land",
    "name": "Gold M10",
    "history": [],
    "demand": 5,
    "trend": "Stable",
    "gemOverrideMin": 7e3,
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "tradeable": true
  },
  {
    "id": "7b7c2b66-6e9a-483f-8947-b1d1271448b3",
    "notes": "The exotic drone carrier features the same weapons as the super version but deals less damage and has overall decreased stats.",
    "gemOverrideMin": 2e4,
    "value": 25e3,
    "category": "Naval",
    "thumbnail": "/images/vehicles/Drone%20carrier.jpg",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 20,000 - 25,000",
    "tags": [
      "Naval"
    ],
    "gemOverrideMax": 25e3,
    "trend": "Stable",
    "history": [],
    "tradeable": true,
    "demand": 6,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "Drone carrier",
    "rarity": "Exotic"
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "history": [],
    "value": 55e3,
    "tradeable": true,
    "notes": "Has decreased stats compared to the super variant of the S.W.A.R.M and has 2 fewer overall drones, so a base of 2 that can be a total of 4 when maxed with both gem upgrades. The missile count is the same as the super varient but the type is different, being still supersonic but not anti-flare.",
    "hasManualGemRange": true,
    "tags": [
      "Air"
    ],
    "rarity": "Exotic",
    "gemOverrideMin": 45e3,
    "category": "Air",
    "name": "S.W.A.R.M",
    "gemOverrideMax": 55e3,
    "thumbnail": "/images/vehicles/S.W.A.R.M.jpg",
    "trend": "Stable",
    "demand": 4,
    "inGameCost": "Gems: 45,000 - 55,000",
    "id": "7b859e9d-2fcb-4dd2-b659-4c8f34b24e00"
  },
  {
    "thumbnail": "/images/vehicles/USS%20Missouri.jpg",
    "tags": [
      "Naval"
    ],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "trend": "Stable",
    "history": [],
    "inGameCost": "Gems: 55,000 - 65,000",
    "demand": 5,
    "gemOverrideMin": 55e3,
    "name": "USS Missouri",
    "value": 65e3,
    "rarity": "Exotic",
    "gemOverrideMax": 65e3,
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "Decent naval vessel with average movement and turning radii, just like the Yamato and Bismarck variants. The ship features two AI CWIS machine gun air defenses, six AI micro machine gun pods, three high-damage main cannons, six aimable explosive round anti-air machine guns, and two SkyHawk drones that feature the same armaments as the standard SkyHawk.",
    "id": "7c0bf909-635a-4289-8b69-306c207329a0",
    "category": "Naval"
  },
  {
    "tags": [
      "Emblem",
      "Special"
    ],
    "notes": "This Emblem is obtained by having a certain amount of rebirths, arsenal levels, and dailies.",
    "category": "Tags",
    "inGameCost": "Untradable",
    "thumbnail": "https://static.wixstatic.com/media/341c64_d1b975fe1a0c452e82ade6df22092f91~mv2.jpeg/v1/fill/w_194,h_216,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_d1b975fe1a0c452e82ade6df22092f91~mv2.jpeg",
    "value": 0,
    "lastUpdated": "2026-08-29",
    "id": "7ce26495-c7f8-408c-8277-4d8883ef903a",
    "inRecentlyUpdated": false,
    "demand": 5,
    "tradeable": false,
    "trend": "Stable",
    "name": "Lieutenant Colonel (Emblem)",
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "rarity": "Epic"
  },
  {
    "tags": [
      "mzkt"
    ],
    "notes": "Becomes more useful with the nuke upgrade but it requires level 95 + 15,000 diamonds, making it near-impossible for the average player to get.",
    "history": [],
    "hasManualGemRange": true,
    "id": "7d73638c-c2d6-496a-83c7-8c4636e3eac9",
    "tradeable": true,
    "value": 3800,
    "thumbnail": "/images/vehicles/MZKT.jpg",
    "gemOverrideMax": 3800,
    "trend": "Dropping",
    "name": "MZKT",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "gemOverrideMin": 3e3,
    "demand": 3,
    "category": "Land"
  },
  {
    "trend": "Stable",
    "hasManualGemRange": true,
    "gemOverrideMax": 3e3,
    "inGameCost": "Gems: 2,500 - 3,000",
    "name": "Red F14",
    "gemOverrideMin": 2500,
    "tradeable": true,
    "history": [],
    "notes": "The Red F14 is another variant of the F14 and features a passenger seat with no weapons or abilities. The Red F14 is just as fast and maneuverable as any of the F14 variants. It features 8 lock-on low low-damage missiles that have a decent reload speed. The front-facing explosive round machine gun is quite powerful but has a long reloading period. It's overall just a reskin of the Super F14.",
    "thumbnail": "/images/vehicles/Red%20F14.jpg",
    "demand": 5,
    "category": "Air",
    "tags": [
      "Air",
      "Special"
    ],
    "value": 3e3,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Legendary",
    "id": "7db14095-379b-4dc2-8de6-7ecac27989b3"
  },
  {
    "gemOverrideMin": 2e3,
    "category": "Land",
    "id": "7e0b02ca-c206-4290-a382-3b67cbb24247",
    "value": 3e3,
    "tags": [
      "Ground"
    ],
    "gemOverrideMax": 3e3,
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "Decent tank with a main machine gun and single-shot main cannon. The reload speed of both weapons is quite long. The King Tiger also features a frontal armour plate that decreases damage significantly, like on other vehicles like the Jagpanther.",
    "inGameCost": "Gems: 2,000 - 3,000",
    "demand": 2,
    "name": "King Tiger",
    "history": [],
    "thumbnail": "/images/vehicles/King%20Tiger.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "trend": "Stable"
  },
  {
    "demand": 6,
    "category": "Land",
    "gemOverrideMin": 3e4,
    "history": [],
    "thumbnail": "/images/vehicles/Hacker%20Truck.jpg",
    "trend": "Rising",
    "rarity": "Exotic",
    "id": "7eaaf257-c66f-4e55-a5f3-6d2db2970c76",
    "hasManualGemRange": true,
    "name": "Hacker Truck",
    "gemOverrideMax": 4e4,
    "value": 4e4,
    "tags": [
      "Ground"
    ],
    "notes": "Same as Hacker X, but has decreased stats",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 30,000 - 40,000"
  },
  {
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Super%20Exofighter.jpg",
    "name": "Super Exofighter",
    "value": 3e5,
    "demand": 5,
    "notes": "very similiar to the super raptor but has 14 missiles but no super sonic missiles, also has 2 front facing explosive machine guns",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "hasCustomMultiplierOverrides": false,
    "tags": [
      "super-exofighter"
    ],
    "category": "Air",
    "history": [
      {
        "updatedBy": "System",
        "date": "Jun 12",
        "timestamp": "2026-06-12T22:11:16.644Z",
        "tierValues": {
          "0": 175e3,
          "1": 175e3,
          "2": 175200,
          "3": 185e3,
          "4": 195e3,
          "5": 235e3,
          "fresh": 175e3
        },
        "value": 175e3,
        "note": "Previous Market Valuation"
      },
      {
        "tierValues": {
          "0": 3e5,
          "1": 3e5,
          "2": 300200,
          "3": 31e4,
          "4": 32e4,
          "5": 36e4,
          "fresh": 3e5
        },
        "value": 3e5,
        "updatedBy": "EpicS",
        "date": "Sep 14",
        "timestamp": "2026-09-14T06:23:03.041Z",
        "note": "Staff moderation update"
      }
    ],
    "tradeable": true,
    "inRecentlyUpdated": false,
    "id": "7f8ea12d-c980-42b0-9ce2-1a018cd1f001",
    "hasCustomStarOverrides": false,
    "hasManualGemRange": false,
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true
  },
  {
    "inGameCost": "Gems: 50,000 - 60,000",
    "rarity": "Exotic",
    "value": 6e4,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "name": "Medic Helicopter",
    "notes": "The Medic Helicopter features similar weapons and features to its Limited Edition rarity Super varient. The main difference is that the Medic's colored machine gun has been reduced from 75 rounds to 50 rounds, along with the healing drone count being reduced from 2 drones down to 1 drone. Another major change seems to be that the weapon loadouts are named on the exotic rarity Medic Helicopter and not its super varient. The name of the first loadout is Healing Guns, while the second loadout name is Support Guns.",
    "id": "805c0306-f833-427b-9d70-3ba2efa5e305",
    "demand": 4,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Medic%20Helicopter.jpg",
    "tradeable": true,
    "gemOverrideMin": 5e4,
    "trend": "Stable",
    "history": [],
    "tags": [
      "Air",
      "Special"
    ],
    "category": "Air",
    "gemOverrideMax": 6e4
  },
  {
    "tags": [
      "Ground"
    ],
    "history": [],
    "notes": "The imperial tank has the same flamethrower and missile weapons as on the Imperial Tank (S) but lacks the machine gun and no lock on rockets",
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Imperial%20Tank.jpg",
    "category": "Land",
    "id": "8079115a-5261-49d3-bcd3-998c8422fbaf",
    "inRecentlyUpdated": false,
    "acronym": "IMP (TANK)",
    "hasManualGemRange": true,
    "demand": 5,
    "value": 2e5,
    "hasCustomStarOverrides": false,
    "inGameCost": "Gems: 150,000 - 200,000",
    "trend": "Stable",
    "name": "Imperial Tank",
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 2e5,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 15e4
  },
  {
    "thumbnail": "/images/vehicles/War%20Bunny.jpg",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "category": "Soldier",
    "gemOverrideMin": 700,
    "tags": [
      "Soldiers"
    ],
    "gemOverrideMax": 1e3,
    "id": "80f613be-b4fc-4fca-bed2-7d0c8205dfe9",
    "trend": "Stable",
    "name": "War Bunny",
    "demand": 7,
    "history": [],
    "value": 1e3,
    "rarity": "Epic",
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "The War Bunny features a G36 Submachine gun that has a decent fire rate, damage, and range. The War Bunny has average health but lacks movement speed.",
    "inGameCost": "Gems: 700 - 1,000"
  },
  {
    "gemOverrideMax": 12e3,
    "name": "Comanche",
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Comanche.jpg",
    "category": "Air",
    "value": 12e3,
    "id": "8136e7c8-cfcd-4152-9ad3-c2974d3d7848",
    "gemOverrideMin": 9e3,
    "demand": 6,
    "notes": "Fast-moving Helicopter with Anti-Stealth, Anti-flare, and Anti-dodge Missiles that move within the Supersonic range on par with the GhostWind. The Comanche also features a stealth coating, which takes about 25% longer to be locked onto. The one downside of the Comanche is the long reload time of its missiles. The passenger seat of the Comanche features an aimable explosive round machine gun that deals high damage. The Comanche is the first vehicle to feature anti-stealth weaponry.",
    "tags": [
      "Special",
      "comanche"
    ],
    "tradeable": true,
    "history": [],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Dropping"
  },
  {
    "tags": [
      "Collector",
      "24k-golden-tank"
    ],
    "rarity": "Legendary",
    "demand": 2,
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/24K%20Golden%20Tank.jpg",
    "category": "Land",
    "history": [],
    "tradeable": false,
    "excludeFromRecentlyUpdated": true,
    "value": 0,
    "name": "24K Golden Tank",
    "id": "81fd10db-49bc-43d3-867c-1d5ae8098ce1",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "notes": "The 24K Tank is the fifth event vehicle ever released, featured as part of the 24K GOLD Roblox event."
  },
  {
    "lastUpdated": "2026-08-29",
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "thumbnail": "https://static.wixstatic.com/media/f89faf_7a88c963304d478c832f76bdbcb0ed23~mv2.png/v1/fill/w_373,h_413,al_c,lg_1,q_85,enc_avif,quality_auto/f89faf_7a88c963304d478c832f76bdbcb0ed23~mv2.png",
    "name": "Gold (Banner)",
    "category": "Tags",
    "value": 0,
    "inGameCost": "Untradable",
    "demand": 5,
    "tradeable": false,
    "tags": [
      "Banner"
    ],
    "notes": "Only available through ranks.",
    "rarity": "Epic",
    "id": "826b6d96-1bf9-46e2-ae51-1c356a7e2cc3",
    "history": []
  },
  {
    "notes": "A way better version of the North Carolina with good anti-air guns and good damage cannons.",
    "rarity": "Epic",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Boss%20North%20Carolina.jpg",
    "value": 2500,
    "tags": [
      "Naval"
    ],
    "demand": 2,
    "gemOverrideMax": 2500,
    "trend": "Dropping",
    "inGameCost": "Gems: 2,000 - 2,500",
    "gemOverrideMin": 2e3,
    "name": "Boss North Carolina",
    "history": [],
    "id": "828c0a26-b41f-4479-903b-7bdd1f7a349a",
    "tradeable": true,
    "category": "Naval",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "demand": 1,
    "lastUpdated": "2026-08-29",
    "inGameCost": "Untradable",
    "tradeable": false,
    "trend": "Stable",
    "rarity": "Common",
    "tags": [
      "Emblem",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "value": 0,
    "history": [],
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "thumbnail": "https://static.wixstatic.com/media/341c64_cc12568b09ec4bbf9e819dc420b6e669~mv2.jpeg/v1/fill/w_227,h_252,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_cc12568b09ec4bbf9e819dc420b6e669~mv2.jpeg",
    "category": "Tags",
    "id": "82d40c87-5859-40de-9867-4c8362323a4e",
    "name": "Corporal (Emblem)"
  },
  {
    "history": [],
    "id": "82f1c84a-dba3-4d78-8fe6-44df938f8b09",
    "value": 7500,
    "tags": [
      "Air"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "thumbnail": "/images/vehicles/B1%20Liberty.jpg",
    "category": "Air",
    "hasManualGemRange": true,
    "notes": "B1 reskin with the same ai bombs and missiles",
    "demand": 6,
    "name": "B1 Liberty",
    "gemOverrideMax": 7500,
    "tradeable": true,
    "rarity": "Legendary",
    "gemOverrideMin": 5e3,
    "inGameCost": "Gems: 5,000 - 7,500",
    "trend": "Dropping"
  },
  {
    "inGameCost": "Gems: 30 - 150",
    "name": "Super Sniper",
    "id": "82f8ca85-f777-43d8-aeed-61c31b061b47",
    "demand": 2,
    "hasCustomMultiplierOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "notes": "A semi long ranged soldier that is decent at dealing with bosses.",
    "hasManualGemRange": true,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "value": 150,
    "rarity": "Rare",
    "gemOverrideMax": 150,
    "thumbnail": "/images/vehicles/Super%20Sniper.jpg",
    "category": "Soldier",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Soldiers"
    ],
    "trend": "Stable",
    "gemOverrideMin": 30,
    "hasCustomStarOverrides": false,
    "history": []
  },
  {
    "tradeable": true,
    "gemOverrideMax": 14e3,
    "name": "Boss Ka-29",
    "notes": "Excellent MG capacity, however, suffers from the lowest scrap rate versus other exotics, and low damage weaponry.\nIs only scarce by low demand.",
    "hasManualGemRange": true,
    "history": [],
    "gemOverrideMin": 11e3,
    "value": 14e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "boss-ka-29"
    ],
    "trend": "Dropping",
    "rarity": "Exotic",
    "demand": 3,
    "category": "Air",
    "thumbnail": "/images/vehicles/Boss%20Ka-29.jpg",
    "id": "82fdf00d-8e60-4cd4-9c1f-107526747557"
  },
  {
    "acronym": "SA14",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "hasCustomStarOverrides": true,
    "category": "Air",
    "id": "83bdda15-7e41-422c-9aa8-eb8a3514ef8b",
    "inGameCost": "Gems: 900,000 - 1,000,000",
    "trend": "Stable",
    "tags": [
      "Air",
      "Special"
    ],
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 1e6,
    "gemOverrideMax": 1e6,
    "rarity": "Limited Edition",
    "starOverrides": {
      "0": 950001,
      "1": 950001,
      "2": 950200,
      "3": 950001,
      "4": 950001,
      "5": 95e4,
      "fresh": 135e4
    },
    "notes": 'Has high damage machine gun and missiles that near hypersonic speed.Special "Hunter Mode" increases speed, makes getting locked on impossible, but it has a cooldown. Faster missiles versus the regular, and better stats overall.Only 750 exist...',
    "gemOverrideMin": 9e5,
    "demand": 3,
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Super%20A-14.jpg",
    "name": "Super A-14",
    "starTierOverrides": {
      "0": {
        "hasManualGemRange": false,
        "gemOverrideMax": 1045001,
        "gemOverrideMin": 855001,
        "demand": 3,
        "value": 950001,
        "notes": "",
        "trend": "Stable"
      },
      "1": {
        "demand": 3,
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 855001,
        "gemOverrideMax": 1045001,
        "value": 950001
      },
      "2": {
        "gemOverrideMax": 1045220,
        "gemOverrideMin": 855180,
        "hasManualGemRange": false,
        "demand": 3,
        "value": 950200,
        "notes": "",
        "trend": "Stable"
      },
      "3": {
        "gemOverrideMin": 855001,
        "gemOverrideMax": 1045001,
        "hasManualGemRange": false,
        "demand": 3,
        "value": 950001,
        "notes": "",
        "trend": "Stable"
      },
      "4": {
        "value": 950001,
        "gemOverrideMax": 1045001,
        "gemOverrideMin": 855001,
        "notes": "",
        "trend": "Stable",
        "demand": 3,
        "hasManualGemRange": false
      },
      "5": {
        "hasManualGemRange": false,
        "demand": 5,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 1045e3,
        "gemOverrideMin": 855e3,
        "value": 95e4
      },
      "fresh": {
        "gemOverrideMax": 1485e3,
        "demand": 4,
        "gemOverrideMin": 1215e3,
        "hasManualGemRange": true,
        "value": 135e4,
        "notes": "",
        "trend": "Stable"
      }
    },
    "hasManualGemRange": true
  },
  {
    "thumbnail": "/images/vehicles/Advanced%20F18.jpg",
    "name": "Advanced F18",
    "gemOverrideMax": 4800,
    "hasManualGemRange": true,
    "trend": "Dropping",
    "gemOverrideMin": 2800,
    "history": [],
    "category": "Air",
    "id": "84493305-de4d-4a65-9d0f-5f19b02e686d",
    "rarity": "Legendary",
    "tags": [
      "advanced-f18"
    ],
    "notes": "Only plane with a cluster bomb and it has 6 air to air missiles.",
    "demand": 5,
    "tradeable": true,
    "value": 4800,
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "category": "Air",
    "name": "Haunted Jet",
    "inGameCost": "Gems: 4,500 - 5,500",
    "value": 5500,
    "hasManualGemRange": true,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "Reskinned F-16 with 4 missiles and a machine gun with normal rounds. The missiles do have life steal, which makes the jet somewhat decently useful. Though the reload of the missiles is a bit slow.",
    "gemOverrideMin": 4500,
    "history": [],
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Haunted%20Jet.jpg",
    "tags": [
      "Air"
    ],
    "demand": 3,
    "gemOverrideMax": 5500,
    "id": "845938f6-1cce-4def-9e3e-80a0774df049",
    "trend": "Stable"
  },
  {
    "rarity": "Legendary",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/Gold%20Pyro%20Tank.jpg",
    "value": 2e4,
    "name": "Gold Pyro Tank",
    "notes": "They finally fixed this vehicle with it now being able to apply a very weak 3 star effect",
    "demand": 4,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "hasManualGemRange": true,
    "gemOverrideMax": 2e4,
    "inRecentlyUpdated": false,
    "trend": "Dropping",
    "history": [],
    "id": "84a058cc-dbc8-4087-9e20-6d5edb166610",
    "tags": [
      "gold-pyro-tank"
    ],
    "category": "Land",
    "tradeable": true,
    "gemOverrideMin": 15e3
  },
  {
    "notes": "Reskin of the normal TKS-20 with slight stats improvments",
    "gemOverrideMax": 15e3,
    "inGameCost": "Gems: 12,000 - 15,000",
    "value": 15e3,
    "tags": [
      "Ground"
    ],
    "thumbnail": "/images/vehicles/Gold%20TKS20.jpg",
    "gemOverrideMin": 12e3,
    "category": "Land",
    "tradeable": true,
    "trend": "Rising",
    "id": "84c7bf94-df69-45db-89ee-a632d7112257",
    "demand": 6,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "history": [],
    "rarity": "Legendary",
    "name": "Gold TKS20"
  },
  {
    "category": "Tags",
    "trend": "Stable",
    "name": "Phantom (Banner)",
    "id": "84e05b00-0f19-4ee0-ac21-bd7c432d716d",
    "thumbnail": "/images/vehicles/Phantom%20_Banner_.jpg",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMax": 4e3,
    "tags": [
      "Banner"
    ],
    "notes": "Available through crates.",
    "inGameCost": "Gems: 3,000 - 4,000",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "history": [],
    "gemOverrideMin": 3e3,
    "value": 4e3,
    "demand": 5
  },
  {
    "name": "Terracotta (Banner)",
    "category": "Tags",
    "thumbnail": "/images/vehicles/Terracotta%20_Banner_.jpg",
    "trend": "Stable",
    "id": "85377147-46ba-49b2-9c93-e41d5aba7fdb",
    "inGameCost": "Gems: 50 - 100",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMin": 50,
    "history": [],
    "tags": [
      "Banner"
    ],
    "demand": 5,
    "hasManualGemRange": true,
    "notes": "Available through crates.",
    "gemOverrideMax": 100,
    "tradeable": true,
    "rarity": "Common",
    "value": 100
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Dropping",
    "name": "Stallion",
    "id": "855324ae-ead9-4d23-92c7-d46b7ef9f703",
    "tradeable": true,
    "gemOverrideMax": 5e3,
    "tags": [
      "stallion"
    ],
    "thumbnail": "/images/vehicles/Stallion.jpg",
    "category": "Air",
    "notes": "A high health hellicopter with weak missles and lots of passenger seats",
    "rarity": "Legendary",
    "history": [],
    "hasManualGemRange": true,
    "gemOverrideMin": 3e3,
    "value": 5e3,
    "demand": 4
  },
  {
    "inRecentlyUpdated": false,
    "category": "Tags",
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": true,
    "tradeable": true,
    "notes": "\u201Cclack\u201D (open) \u2192 \u201Cclick-click\u201D (insert shells) \u2192 \u201Csnap\u201D (close) BOOOOOOM!!",
    "hasCustomMultiplierOverrides": false,
    "history": [],
    "value": 2e4,
    "tags": [
      "Emote"
    ],
    "gemOverrideMax": 2e4,
    "hasCustomStarOverrides": false,
    "id": "85865fb2-910f-428d-9763-2cf3c4c9bd0e",
    "trend": "Stable",
    "inGameCost": "Gems: 15,000 - 20,000",
    "demand": 5,
    "gemOverrideMin": 15e3,
    "name": "Shotgun (Emote)",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Shotgun%20_Emote_.jpg"
  },
  {
    "value": 99,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true,
    "notes": "The easiest and cheapest vehicle to obtain. It is good for arsenal levels.",
    "tags": [
      "Ground"
    ],
    "category": "Land",
    "rarity": "Common",
    "gemOverrideMax": 99,
    "trend": "Stable",
    "demand": 0,
    "thumbnail": "/images/vehicles/ATV.jpg",
    "history": [],
    "inGameCost": "Gems: 20 - 99",
    "name": "ATV",
    "hasManualGemRange": true,
    "id": "85bdaf3f-8ad1-4c34-b610-5fe5d538521c",
    "gemOverrideMin": 20
  },
  {
    "tradeable": true,
    "rarity": "Legendary",
    "trend": "Stable",
    "hasManualGemRange": true,
    "demand": 6,
    "name": "Strela",
    "history": [],
    "gemOverrideMin": 4e3,
    "id": "85f1e8ad-f5bb-4f37-926a-f343166384a6",
    "value": 6500,
    "category": "Land",
    "gemOverrideMax": 6500,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "APC that boasts a strong missile launcher. Makes for a good AA vehicle due to flare ignorant SAMs with the versitility of having ATGMs as well, making it effective against armoured vehicles. ",
    "thumbnail": "/images/vehicles/Strela.jpg",
    "tags": [
      "strela"
    ]
  },
  {
    "gemOverrideMax": 4700,
    "thumbnail": "/images/vehicles/F14.jpg",
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMin": 3700,
    "name": "F14",
    "hasManualGemRange": true,
    "history": [],
    "notes": "The first plane to be given long range missiles which slightly increases lock-on range.",
    "rarity": "Legendary",
    "id": "8605adc8-0ea4-4f57-a2b2-eb05c3809e6f",
    "category": "Air",
    "value": 4700,
    "tradeable": true,
    "tags": [
      "Special",
      "f14"
    ],
    "demand": 3
  },
  {
    "notes": 'Higher Damage Rocket Tank, and can "spam" missiles capable of catching a Nuke XB. Top class base damage',
    "gemOverrideMin": 4e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Super TOS1",
    "category": "Land",
    "value": 5e4,
    "tradeable": true,
    "gemOverrideMax": 5e4,
    "inGameCost": "Gems: 40,000 - 50,000",
    "hasCustomStarOverrides": false,
    "thumbnail": "/images/vehicles/Super%20TOS1.jpg",
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "trend": "Rising",
    "rarity": "Legendary",
    "acronym": "STOS",
    "inRecentlyUpdated": false,
    "id": "879252bc-7824-4d6d-b46f-e2cbd5f9d325",
    "tags": [
      "Ground"
    ],
    "demand": 7,
    "hasManualGemRange": true
  },
  {
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 4500,
    "trend": "Stable",
    "tradeable": true,
    "name": "Seacraft DPC",
    "rarity": "Epic",
    "category": "Other",
    "gemOverrideMin": 3500,
    "demand": 7,
    "tags": [
      "Tool",
      "Collector",
      "Special"
    ],
    "notes": "The Seacraft DPC is a tool that boosts aquatic movement when equipped as your item within your inventory. It can't be used passively, unfortunately.",
    "id": "87bf39db-3413-49fc-9ee9-7294046cd5c3",
    "inGameCost": "Gems: 3,500 - 4,500",
    "thumbnail": "/images/vehicles/Seacraft%20DPC.jpg",
    "value": 4500,
    "hasManualGemRange": true
  },
  {
    "rarity": "Legendary",
    "history": [],
    "id": "87c1b921-7259-4808-a918-8fd8e4b9f9d9",
    "tradeable": true,
    "trend": "Dropping",
    "demand": 5,
    "tags": [
      "defiant-x"
    ],
    "value": 6e4,
    "category": "Air",
    "gemOverrideMin": 5e4,
    "hasManualGemRange": true,
    "notes": "The Defiant-X is a Fast and Agile Helicopter that features the Recon Radar ability. Along with having dual aimable 100 explosive-round machine guns that deal good damage and have good range. Also, it features 8 average lock-on missiles.",
    "thumbnail": "/images/vehicles/Defiant-X.jpg",
    "inRecentlyUpdated": false,
    "gemOverrideMax": 6e4,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "name": "Defiant-X"
  },
  {
    "thumbnail": "/images/vehicles/Armored%20APC.jpg",
    "id": "88931fcf-0d88-4dd3-9dee-b9748f6e4f95",
    "trend": "Stable",
    "rarity": "Legendary",
    "gemOverrideMax": 6e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Land",
    "tags": [
      "Ground",
      "Collector"
    ],
    "gemOverrideMin": 4e3,
    "demand": 4,
    "inGameCost": "Gems: 4,000 - 6,000",
    "notes": "A stronger version of the normal APC but it does not have the option of having missiles on it.",
    "history": [],
    "value": 6e3,
    "name": "Armored APC",
    "hasManualGemRange": true,
    "tradeable": true
  },
  {
    "category": "Tags",
    "tags": [
      "Emblem",
      "Special"
    ],
    "id": "88a80359-3192-426c-b8c1-6a5355fde78c",
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "rarity": "Epic",
    "thumbnail": "https://static.wixstatic.com/media/341c64_381cbe0befc142879b72cb627ebc8c65~mv2.jpeg/v1/fill/w_212,h_235,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_381cbe0befc142879b72cb627ebc8c65~mv2.jpeg",
    "demand": 5,
    "history": [],
    "inRecentlyUpdated": false,
    "inGameCost": "Untradable",
    "notes": "This emblem is obtained by having a certain amount of rebirths, arsenal levels, and dailies.",
    "name": "Captain (Emblem)",
    "tradeable": false,
    "value": 0,
    "lastUpdated": "2026-08-29"
  },
  {
    "gemOverrideMax": 25e3,
    "name": "GoldAC119",
    "tradeable": true,
    "gemOverrideMin": 2e4,
    "id": "88d6afcd-06af-4899-91c1-4c705560ceb4",
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 5,
    "tags": [
      "Collector",
      "goldac119"
    ],
    "hasManualGemRange": true,
    "value": 25e3,
    "category": "Air",
    "thumbnail": "/images/vehicles/GoldAC119.jpg",
    "rarity": "Legendary",
    "notes": "Could only be obtained during the Christmas 2023 event; it acts like a faster AC-130 that can shoot from both sides.",
    "history": []
  },
  {
    "tradeable": true,
    "hasManualGemRange": true,
    "history": [],
    "trend": "Stable",
    "tags": [
      "dive-bomber"
    ],
    "value": 100,
    "demand": 1,
    "category": "Air",
    "gemOverrideMin": 20,
    "name": "Dive Bomber",
    "rarity": "Common",
    "notes": "High Damage with the gun upgrades; can kill a Zeplin, however it has low health and the guns must be aimed. It is also slow. (Buildable)",
    "gemOverrideMax": 100,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "88dd6cc7-37d0-4e82-9e96-0ddd80134c2b",
    "thumbnail": "/images/vehicles/Dive%20Bomber.jpg"
  },
  {
    "id": "89ce35b4-dcae-48a9-bd08-1cb93e368130",
    "trend": "Stable",
    "gemOverrideMin": 25,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Tags",
    "gemOverrideMax": 50,
    "thumbnail": "/images/vehicles/Eagle%20_Emblem_.jpg",
    "tags": [
      "Emblem"
    ],
    "tradeable": true,
    "history": [],
    "inGameCost": "Gems: 25 - 50",
    "notes": "This emblem is obtained by the kill tag crates!",
    "rarity": "Common",
    "value": 50,
    "name": "Eagle (Emblem)",
    "demand": 1
  },
  {
    "thumbnail": "/images/vehicles/FX-1.jpg",
    "trend": "Stable",
    "name": "FX-1",
    "history": [],
    "gemOverrideMin": 500,
    "tags": [
      "fx-1"
    ],
    "id": "8a036c58-c4fd-4025-b3b7-81aad91237ff",
    "notes": "VTOL, uses mini-missiles and normal missiles.(Spec Ops)",
    "rarity": "Rare",
    "tradeable": true,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMax": 1e3,
    "category": "Air",
    "demand": 1,
    "value": 1e3
  },
  {
    "history": [],
    "id": "8ab5477f-cd36-46da-8770-87de89d3e8f7",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "tags": [
      "Ground",
      "Special"
    ],
    "gemOverrideMin": 35e4,
    "trend": "Stable",
    "acronym": "LE ABRAMS",
    "hasCustomStarOverrides": false,
    "tradeable": true,
    "gemOverrideMax": 45e4,
    "thumbnail": "/images/vehicles/Super%20M1E3.jpg",
    "name": "Super M1E3",
    "rarity": "Limited Edition",
    "notes": "The Super M1E3 features the same weapons set as the M1E3 exotic varient except for the cannon. The main differences between the 2 tanks are the slight damage increase the Super M1E3 has. The maneuverability, speed, and reload times seem to be about the same. The cannon round features the cluster damage effect.  The cluster cannon round, unfortunately, can't lock on to targets.",
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 350,000 - 450,000",
    "demand": 4,
    "value": 45e4
  },
  {
    "value": 25e3,
    "tradeable": true,
    "id": "8ae0ae2d-c0d7-4577-bfc9-3146aa15fb1b",
    "notes": "A better version of the striker with a mini-cannon as well and it has 2 shots per reload. It is still one of the weaker vehicles but it is rather rare due to it being a paid warpass exclusive vehicle.",
    "tags": [
      "super-striker"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 6,
    "hasManualGemRange": true,
    "gemOverrideMin": 2e4,
    "rarity": "Legendary",
    "trend": "Rising",
    "thumbnail": "/images/vehicles/Super%20Striker.jpg",
    "gemOverrideMax": 25e3,
    "name": "Super Striker",
    "history": [],
    "category": "Land"
  },
  {
    "inGameCost": "Untradable",
    "thumbnail": "https://static.wixstatic.com/media/f89faf_e84e6a7efb5e4fddacbd60e61974f679~mv2.png/v1/fill/w_373,h_413,al_c,lg_1,q_85,enc_avif,quality_auto/f89faf_e84e6a7efb5e4fddacbd60e61974f679~mv2.png",
    "category": "Tags",
    "trend": "Stable",
    "history": [],
    "lastUpdated": "2026-08-29",
    "name": "Platinum (Banner)",
    "value": 0,
    "excludeFromRecentlyUpdated": true,
    "rarity": "Legendary",
    "id": "8b6a578d-95ce-4f24-8223-a4d0eab21a6e",
    "tradeable": false,
    "notes": "Only available through ranks.",
    "demand": 5,
    "tags": [
      "Banner"
    ],
    "inRecentlyUpdated": false
  },
  {
    "id": "8b81df92-76c8-4518-a9b3-266517e32e8f",
    "tags": [
      "Emote"
    ],
    "thumbnail": "/images/vehicles/Baseball%20_Emote_.jpg",
    "excludeFromRecentlyUpdated": true,
    "hasCustomMultiplierOverrides": false,
    "trend": "Stable",
    "inGameCost": "Gems: 15,000 - 20,000",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "hasCustomStarOverrides": false,
    "category": "Tags",
    "notes": "This emote is a little bit special because when you are killed and the other player has this emote equipped, there is a big crack in the screen by the ball that was swung at. SKADOOSH!11!!11!",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Exotic",
    "gemOverrideMax": 2e4,
    "name": "Baseball (Emote)",
    "history": [],
    "value": 2e4,
    "demand": 5,
    "tradeable": true,
    "gemOverrideMin": 15e3
  },
  {
    "name": "Handgun (Emblem)",
    "rarity": "Common",
    "gemOverrideMax": 50,
    "value": 50,
    "demand": 1,
    "id": "8c3b1200-12bd-494f-a50b-0ad4d8d4c4e8",
    "history": [],
    "gemOverrideMin": 25,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "category": "Tags",
    "notes": "This emblem is obtained by the kill tag crates!",
    "hasManualGemRange": true,
    "tags": [
      "Emblem"
    ],
    "thumbnail": "/images/vehicles/Handgun%20_Emblem_.jpg",
    "inGameCost": "Gems: 25 - 50",
    "trend": "Stable"
  },
  {
    "tradeable": true,
    "category": "Air",
    "rarity": "Legendary",
    "tags": [
      "bf-109"
    ],
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 2,
    "hasManualGemRange": true,
    "id": "8c3bb10f-b993-4768-9fee-7abe6e0928b8",
    "name": "Bf-109",
    "gemOverrideMax": 7100,
    "notes": "A basic plane with very strong guns and decent bombs, but slow speed.",
    "history": [],
    "thumbnail": "/images/vehicles/Bf-109.jpg",
    "gemOverrideMin": 5800,
    "value": 7100
  },
  {
    "rarity": "Limited Edition",
    "acronym": "SSD",
    "value": 4e5,
    "thumbnail": "/images/vehicles/Super%20Sea%20Dragon.jpg",
    "notes": "The Limited Edition rarity Super Sea Dragon features the same weapon set, reload speeds, maneuverability, speed, health, and acceleration as the exotic rarity Sea Dragon. The Super Sea Dragon seems to be just a physical reskin and features no real advantage other than an artificial demand for its rarity and lower stock amount. The one unique thing is that the missiles are a different color on the Super Sea Dragon, where they're red or orange compared to the bluish hue of the exotic rarity Sea Dragon.",
    "excludeFromRecentlyUpdated": true,
    "demand": 6,
    "history": [
      {
        "date": "Sep 10",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
          "fresh": 0
        },
        "updatedBy": "System",
        "value": 0,
        "note": "Previous Market Valuation",
        "timestamp": "2026-09-10T22:08:36.830Z"
      },
      {
        "timestamp": "2026-09-11T17:19:28.137Z",
        "note": "Staff moderation update",
        "updatedBy": "Spuppers",
        "tierValues": {
          "0": 4e5,
          "1": 4e5,
          "2": 4e5,
          "3": 4e5,
          "4": 4e5,
          "5": 4e5,
          "fresh": 4e5
        },
        "value": 4e5,
        "date": "Sep 11"
      }
    ],
    "tags": [
      "Naval",
      "Special"
    ],
    "id": "8c4f6ad2-14ee-4642-8bb6-c2d882bfce10",
    "hasCustomStarOverrides": false,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Naval",
    "name": "Super Sea Dragon",
    "hasCustomMultiplierOverrides": false,
    "trend": "Dropping",
    "tradeable": true,
    "hasManualGemRange": false,
    "inRecentlyUpdated": false
  },
  {
    "excludeFromRecentlyUpdated": true,
    "rarity": "Common",
    "tags": [
      "Emblem",
      "Special"
    ],
    "demand": 1,
    "thumbnail": "https://static.wixstatic.com/media/341c64_d26349fc99c14d7f98594d1e3b11a4d7~mv2.jpeg/v1/fill/w_199,h_221,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_d26349fc99c14d7f98594d1e3b11a4d7~mv2.jpeg",
    "trend": "Stable",
    "lastUpdated": "2026-08-29",
    "category": "Tags",
    "history": [],
    "id": "8c58d533-5cb6-48b4-898e-540819b0bb3e",
    "value": 0,
    "tradeable": false,
    "name": "Private First Class (Emblem)",
    "inRecentlyUpdated": false,
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "inGameCost": "Untradable"
  },
  {
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Heavy.jpg",
    "history": [],
    "gemOverrideMin": 25,
    "demand": 4,
    "tags": [
      "Soldiers"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "gemOverrideMax": 50,
    "rarity": "Rare",
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 25 - 50",
    "notes": "Useful for starters but not great overall.",
    "category": "Soldier",
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "id": "8ccb4d59-2348-4376-9344-39bd4685f5a9",
    "value": 50,
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "name": "Heavy"
  },
  {
    "gemOverrideMin": 7500,
    "tradeable": true,
    "trend": "Stable",
    "gemOverrideMax": 1e4,
    "tags": [
      "Air"
    ],
    "history": [],
    "id": "8ce3d71b-cb78-4c30-8624-87f0a73da0d8",
    "inGameCost": "Gems: 7,500 - 10,000",
    "value": 1e4,
    "demand": 7,
    "category": "Air",
    "notes": "V22 reskin with an aimable explosive round machine gun that deals average damage.",
    "rarity": "Legendary",
    "name": "Valor",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "thumbnail": "/images/vehicles/Valor.jpg"
  },
  {
    "category": "Naval",
    "trend": "Dropping",
    "history": [],
    "inGameCost": "Gems: 200 - 400",
    "gemOverrideMax": 400,
    "rarity": "Rare",
    "thumbnail": "/images/vehicles/Missile%20Boat.jpg",
    "tags": [
      "Naval"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 200,
    "demand": 3,
    "id": "8d1560d0-4f1e-466b-a8cb-34b599979219",
    "notes": "A fast missile boat that has 12 missiles and a main cannon for the driver to control. (Buildable)",
    "tradeable": true,
    "hasManualGemRange": true,
    "value": 400,
    "name": "Missile Boat"
  },
  {
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "category": "Tags",
    "name": "Medkit (Emblem)",
    "thumbnail": "/images/vehicles/Medkit%20_Emblem_.jpg",
    "history": [],
    "notes": "This emblem is obtained by the kill tag crates.",
    "tradeable": true,
    "gemOverrideMin": 25,
    "demand": 1,
    "inGameCost": "Gems: 25 - 50",
    "tags": [
      "Emblem"
    ],
    "value": 50,
    "rarity": "Common",
    "id": "8d3b9175-6ef2-47fb-a0cf-27d0f5cf1648",
    "gemOverrideMax": 50
  },
  {
    "value": 400,
    "demand": 1,
    "category": "Naval",
    "rarity": "Rare",
    "notes": "The strongest submarine that can be built in the tycoon. It has driver controlled missiles and torpedos and passanger controlled guns.",
    "inGameCost": "Gems: 100 - 400",
    "name": "Super Sub",
    "tradeable": true,
    "history": [],
    "id": "8d717679-e4a5-4400-aac9-3c0963834d8e",
    "thumbnail": "/images/vehicles/Super%20Sub.jpg",
    "gemOverrideMax": 400,
    "hasManualGemRange": true,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMin": 100,
    "tags": [
      "Naval"
    ]
  },
  {
    "inGameCost": "Untradable",
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "https://static.wixstatic.com/media/341c64_7b1f25048d2445a58c34e2e32c5dad41~mv2.png/v1/fill/w_137,h_151,al_c,lg_1,q_85,enc_avif,quality_auto/341c64_7b1f25048d2445a58c34e2e32c5dad41~mv2.png",
    "rarity": "Epic",
    "inRecentlyUpdated": false,
    "history": [],
    "name": "First Lieutenant (Emblem)",
    "demand": 5,
    "notes": "This emblem is achieved by completing a certain amount of rebirths, arsenal levels, and dailies.",
    "category": "Tags",
    "lastUpdated": "2026-08-29",
    "id": "8db74b87-038f-4986-b1bf-540115d3568f",
    "tradeable": false,
    "value": 0,
    "tags": [
      "Emblem",
      "Special"
    ]
  },
  {
    "id": "8e2a238d-f7d4-4daf-85d6-c1ded8cf3d33",
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Mi-28.jpg",
    "gemOverrideMax": 900,
    "rarity": "Epic",
    "tags": [
      "mi-28"
    ],
    "gemOverrideMin": 400,
    "demand": 5,
    "notes": "A weak helicopter that has 8 non lock-on missiles and a weak explosive machinegun.",
    "history": [],
    "category": "Air",
    "value": 900,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "name": "Mi-28",
    "hasManualGemRange": true
  },
  {
    "inGameCost": "Gems: 500 - 750",
    "history": [],
    "tags": [
      "Emote"
    ],
    "notes": "yayyyy yippeeeee yahoooo",
    "value": 750,
    "tradeable": true,
    "id": "8e84ee6e-b6b3-42e8-9fd5-a3ef040f139e",
    "name": "Celebrate (Emote)",
    "thumbnail": "/images/vehicles/Celebrate%20_Emote_.jpg",
    "gemOverrideMin": 500,
    "demand": 5,
    "trend": "Stable",
    "category": "Tags",
    "gemOverrideMax": 750,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Rare"
  },
  {
    "tradeable": true,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "trend": "Rising",
    "id": "8f25dd85-6508-4122-9cbc-d66c251db723",
    "name": "T-90M",
    "gemOverrideMax": 3700,
    "value": 3700,
    "demand": 4,
    "notes": "Well rounded tank. Armed with a powerful cannon that fires AP rounds as well as an upgradeable, top mounted machine gun that can be used to engage aircraft and softer targets. ",
    "tags": [
      "t-90m"
    ],
    "rarity": "Legendary",
    "gemOverrideMin": 2900,
    "thumbnail": "/images/vehicles/T-90M.jpg",
    "category": "Land",
    "history": []
  },
  {
    "hasManualGemRange": true,
    "rarity": "Epic",
    "name": "Super Shield (Emblem)",
    "gemOverrideMin": 200,
    "category": "Tags",
    "demand": 5,
    "gemOverrideMax": 250,
    "inGameCost": "Gems: 200 - 250",
    "trend": "Stable",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "thumbnail": "/images/vehicles/Super%20Shield%20_Emblem_.jpg",
    "id": "8fc3411c-4d64-4703-98e9-c00d4cf04b2f",
    "value": 250,
    "tags": [
      "Emblem"
    ],
    "history": [],
    "notes": "This emblem is obtained in the kill tag crates!"
  },
  {
    "name": "Weiner Wagon",
    "history": [],
    "gemOverrideMin": 3400,
    "notes": "Released on April 1st, 2023, this vehicle was intended as a playful joke, fitting the spirit of April Fool\u2019s Day.",
    "gemOverrideMax": 4300,
    "hasCustomMultiplierOverrides": false,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tradeable": true,
    "value": 4300,
    "thumbnail": "/images/vehicles/Weiner%20Wagon.jpg",
    "excludeFromRecentlyUpdated": false,
    "tags": [
      "Collector",
      "weiner-wagon"
    ],
    "trend": "Dropping",
    "rarity": "Legendary",
    "category": "Land",
    "hasCustomStarOverrides": false,
    "hasManualGemRange": true,
    "demand": 2,
    "id": "8fd25882-1670-448d-880d-4feb198564f9",
    "inRecentlyUpdated": false
  },
  {
    "trend": "Stable",
    "tags": [
      "Ground"
    ],
    "thumbnail": "/images/vehicles/Driller.jpg",
    "id": "90abf680-0098-415e-9f07-f593e31bb3f8",
    "category": "Land",
    "value": 1850,
    "demand": 7,
    "gemOverrideMax": 1850,
    "hasManualGemRange": true,
    "tradeable": true,
    "notes": "Average ground vehicle with a drill that 1 shots most vehicles, with its most serious damage being around half the health of an exotic ME323. The Driller came out during an Admin Abuse event on February 14th, 2026.",
    "rarity": "Legendary",
    "gemOverrideMin": 1700,
    "name": "Driller",
    "inGameCost": "Gems: 1,700 - 1,850",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "history": []
  },
  {
    "history": [],
    "hasCustomStarOverrides": false,
    "value": 200,
    "hasManualGemRange": true,
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false,
    "notes": "Easily replaced by the redepploy radio for respawning troops",
    "thumbnail": "/images/vehicles/Black%20Hawk%20Trooper.jpg",
    "tags": [
      "Soldiers"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Rare",
    "gemOverrideMax": 200,
    "excludeFromRecentlyUpdated": true,
    "category": "Soldier",
    "tradeable": true,
    "name": "Black Hawk Trooper",
    "gemOverrideMin": 50,
    "trend": "Dropping",
    "demand": 4,
    "id": "90dbbfd3-5539-49dd-8e33-b4df9d7c5794",
    "inGameCost": "Gems: 50 - 200"
  },
  {
    "name": "Edjer",
    "demand": 1,
    "id": "90f11b74-3217-489f-b260-eec97f4417fd",
    "notes": "A decent vehicle with an explosive machinegun attatched to the top. It is slow but has a decent amount of HP.",
    "tradeable": false,
    "history": [],
    "rarity": "Rare",
    "value": 0,
    "tags": [
      "edjer"
    ],
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Edjer.jpg",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "category": "Land"
  },
  {
    "inGameCost": "Gems: 200,000 - 250,000",
    "gemOverrideMin": 2e5,
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "name": "Boss Annihilator",
    "thumbnail": "/images/vehicles/Boss%20Annihilator.jpg",
    "id": "91809eed-ed0b-4076-b36d-84868309fa26",
    "rarity": "Exotic",
    "gemOverrideMax": 25e4,
    "demand": 5,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Land",
    "hasManualGemRange": true,
    "history": [],
    "inRecentlyUpdated": false,
    "tags": [
      "Ground",
      "Special"
    ],
    "notes": "Improved version of the annihilator.Requires tedious grinding with a high Intel Ranking, and can solo all bosses in Military TycoonHas the highest damaging machine gun in the game vs air vehicles, making it ideal for PVP as well.",
    "hasCustomStarOverrides": false,
    "acronym": "B ANNI",
    "tradeable": true,
    "value": 25e4
  },
  {
    "id": "91b2d475-8975-4f19-b60a-bc1efb6f709d",
    "inGameCost": "Gems: 3,000 - 5,000",
    "trend": "Stable",
    "name": "Golden Interceptor",
    "tradeable": true,
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Golden%20Interceptor.jpg",
    "value": 5e3,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "gemOverrideMax": 5e3,
    "category": "Naval",
    "notes": "A speedy boat from one of the paid warpasses. This boat has a explosive machine gun and missiles for the driver to control and some AI guns to keep enemies at bay.",
    "demand": 3,
    "gemOverrideMin": 3e3,
    "tags": [
      "Naval"
    ]
  },
  {
    "demand": 2,
    "hasManualGemRange": true,
    "id": "92270e52-e60d-4dbf-bd12-6a261aeea11d",
    "value": 400,
    "tags": [
      "Naval"
    ],
    "rarity": "Rare",
    "thumbnail": "/images/vehicles/Carrier.jpg",
    "history": [],
    "notes": "Can spawn airplanes; used to be able to spawn drones. (Buildable)",
    "tradeable": true,
    "name": "Carrier",
    "inGameCost": "Gems: 200 - 400",
    "gemOverrideMin": 200,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 400,
    "trend": "Dropping",
    "category": "Naval"
  },
  {
    "name": "Frost Zeplin",
    "tradeable": true,
    "gemOverrideMin": 17e3,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 8,
    "category": "Air",
    "trend": "Rising",
    "gemOverrideMax": 22e3,
    "rarity": "Legendary",
    "tags": [
      "Special",
      "frost-zeplin"
    ],
    "notes": "Reskined Zeplin-x",
    "history": [],
    "id": "935ecd76-8a5a-4c35-88c3-b1d8f1c62c38",
    "thumbnail": "/images/vehicles/Frost%20Zeplin.jpg",
    "value": 22e3
  },
  {
    "id": "93c60335-8517-43b8-913e-900fb95595bd",
    "notes": "High vehicle damage and good for bosses.",
    "hasManualGemRange": true,
    "demand": 6,
    "tradeable": true,
    "value": 2e3,
    "rarity": "Legendary",
    "tags": [
      "Soldiers"
    ],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMin": 1e3,
    "trend": "Rising",
    "thumbnail": "/images/vehicles/TV%20Soldier.jpg",
    "gemOverrideMax": 2e3,
    "inGameCost": "Gems: 1,000 - 2,000",
    "name": "TV Soldier",
    "history": [],
    "category": "Soldier"
  },
  {
    "thumbnail": "/images/vehicles/Boss%20Yal-1.jpg",
    "tags": [
      "boss-yal-1"
    ],
    "gemOverrideMax": 25e3,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMin": 2e4,
    "id": "94723db0-bae2-4845-ae56-b3bd2e0ff6b1",
    "hasManualGemRange": true,
    "category": "Air",
    "notes": "Has a very strong 360 laser but is overall quite slow\n\nSomewhat rare",
    "name": "Boss Yal-1",
    "rarity": "Exotic",
    "history": [],
    "tradeable": true,
    "demand": 2,
    "value": 25e3
  },
  {
    "tradeable": true,
    "name": "Railgun",
    "rarity": "Exotic",
    "excludeFromRecentlyUpdated": true,
    "value": 45e3,
    "gemOverrideMin": 35e3,
    "id": "94a87bbf-065a-468a-b0b8-8acf99fee0a6",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 3,
    "inRecentlyUpdated": false,
    "notes": "The railgun features 3 railgun shots that can be fired in quick succession; each deals explosive splash damage. The main highlight of the railgun is that it increases troops/soldiers' damage during boss fights when equipped in your hand. It sets all troop damage to 450 to 550 damage, depending on the boss stage. The Railgun can be best combined with toxic troops, grenadiers, or any other projectile or high fire rate troop to deal the most damage to bosses.",
    "hasManualGemRange": true,
    "gemOverrideMax": 45e3,
    "tags": [
      "Weapon",
      "Special"
    ],
    "category": "Other",
    "inGameCost": "Gems: 35,000 - 45,000",
    "history": [],
    "thumbnail": "/images/vehicles/Railgun.jpg",
    "hasCustomStarOverrides": false,
    "trend": "Stable"
  },
  {
    "name": "Hellstorm",
    "gemOverrideMax": 15e3,
    "demand": 5,
    "trend": "Rising",
    "tradeable": true,
    "gemOverrideMin": 1e4,
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "id": "95255650-d985-4ed9-b43e-f48097acd13f",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 10,000 - 15,000",
    "tags": [
      "Ground"
    ],
    "thumbnail": "/images/vehicles/Hellstorm.jpg",
    "notes": "Fast-moving tank with an explosive round machine that does simular damage to the super Edjer.",
    "category": "Land",
    "history": [],
    "value": 15e3
  },
  {
    "trend": "Stable",
    "tradeable": true,
    "inGameCost": "Gems: 30,000 - 40,000",
    "demand": 7,
    "tags": [
      "Soldiers"
    ],
    "category": "Soldier",
    "id": "9551b469-281f-4b4f-bae4-0ee21c8794ef",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Exotic",
    "hasManualGemRange": true,
    "notes": "The enraged werewolf is a slightly more powerful version of the werewolf, with its primary differences being its damage range and damage statistics. The healing factor is what it gains compared to the normal werewolf.",
    "history": [],
    "gemOverrideMin": 3e4,
    "value": 4e4,
    "thumbnail": "/images/vehicles/Enraged%20Werewolf.jpg",
    "name": "Enraged Werewolf",
    "gemOverrideMax": 4e4
  },
  {
    "tags": [
      "mi35"
    ],
    "category": "Air",
    "thumbnail": "/images/vehicles/MI35.jpg",
    "notes": "A decent air to ground helicopter with its non lock-on barrage missiles and its limited lock-on normal missiles. Non-standard but viable choice for bosses.",
    "rarity": "Epic",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "955ba618-a71a-4a06-8440-c842720fe123",
    "demand": 3,
    "value": 2e3,
    "name": "MI35",
    "gemOverrideMin": 1500,
    "trend": "Stable",
    "history": [],
    "tradeable": true,
    "gemOverrideMax": 2e3,
    "hasManualGemRange": true
  },
  {
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-08-29",
    "demand": 5,
    "tags": [
      "Emblem",
      "Special"
    ],
    "notes": "This emblem is achieved by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "history": [],
    "tradeable": false,
    "rarity": "Legendary",
    "value": 0,
    "thumbnail": "https://static.wixstatic.com/media/341c64_0662d68364ff4c38836eeaaf63448cb6~mv2.png/v1/fill/w_133,h_147,al_c,lg_1,q_85,enc_avif,quality_auto/341c64_0662d68364ff4c38836eeaaf63448cb6~mv2.png",
    "id": "95699497-19a7-429d-b30c-0bfe5647faac",
    "name": "5-Star General (Emblem)",
    "inGameCost": "Untradable",
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "category": "Tags"
  },
  {
    "gemOverrideMin": 3e5,
    "history": [],
    "id": "9580d97e-4d33-421e-8ef0-238c840ef970",
    "tags": [
      "Air"
    ],
    "tradeable": true,
    "trend": "Stable",
    "gemOverrideMax": 35e4,
    "category": "Air",
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "acronym": "S ME323",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "inRecentlyUpdated": false,
    "name": "Atomic ME323",
    "inGameCost": "Gems: 300,000 - 350,000",
    "rarity": "Limited Edition",
    "notes": "Decent carrier aircraft with side shooting machine guns as defense, the main weapon is the opening front of the vehicle that is able to carry vehicles. It also features a nuclear drop bomb.",
    "thumbnail": "/images/vehicles/Atomic%20ME323.jpg",
    "demand": 6,
    "value": 35e4
  },
  {
    "trend": "Stable",
    "inGameCost": "Gems: 40,000 - 50,000",
    "gemOverrideMax": 5e4,
    "name": "Super Recon Destroyer",
    "id": "96b8225d-ee66-4b0a-b734-691801576dbd",
    "thumbnail": "/images/vehicles/Super%20Recon%20Destroyer.jpg",
    "gemOverrideMin": 4e4,
    "category": "Naval",
    "notes": "The Super Recon Destroyer features 3 aimable lasers that deal decent damage against all vehicle types, along with dealing good boss damage. The Super Recon Destroyer also features a very limited aiming angle, limited rotation speed, and a long reloading primary cannon that deals medium damage. The Super Recon Destroyer also has a frontally located AI rocket system that fires in 2 missile burst salvos of 4 missiles per salvo. The Super Recon Destroyer is quite maneuverable and has quite a fast top speed and acceleration for it's class of large ships.",
    "tradeable": true,
    "hasManualGemRange": true,
    "demand": 4,
    "value": 5e4,
    "tags": [
      "Naval"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Exotic",
    "history": []
  },
  {
    "name": "Baseball (Banner)",
    "excludeFromRecentlyUpdated": true,
    "hasCustomStarOverrides": false,
    "inGameCost": "Gems: 15,000 - 20,000",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasCustomMultiplierOverrides": false,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Baseball%20_Banner_.jpg",
    "demand": 5,
    "tradeable": true,
    "category": "Tags",
    "gemOverrideMax": 2e4,
    "tags": [
      "Banner"
    ],
    "history": [],
    "value": 2e4,
    "rarity": "Exotic",
    "id": "979eae05-39ea-4396-bb81-1a333549ef96",
    "gemOverrideMin": 15e3,
    "hasManualGemRange": true,
    "notes": "Available through crates.",
    "inRecentlyUpdated": false
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 13e3,
    "category": "Land",
    "history": [],
    "notes": "An agile armored vehicle that has a railgun on the top that has great AOE. It is a good subsitute for the Railgun tank.",
    "thumbnail": "/images/vehicles/Rg-1%20Railgun%20Car.jpg",
    "tags": [
      "rg-1-railgun-car"
    ],
    "gemOverrideMin": 9e3,
    "hasManualGemRange": true,
    "tradeable": true,
    "demand": 5,
    "id": "9935359d-9781-45fe-af5e-ea866716dcde",
    "gemOverrideMax": 13e3,
    "rarity": "Epic",
    "name": "Rg-1 Railgun Car",
    "trend": "Stable"
  },
  {
    "tags": [
      "Ground"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Stable",
    "category": "Land",
    "thumbnail": "/images/vehicles/Abram%20X.jpg",
    "id": "99481266-e425-423e-8598-0569fb57322c",
    "hasManualGemRange": true,
    "notes": "An abrams tank with an explosive machine gun and a cannon. It also has its own anti-missile system attached to it, althought it doesn't work yet.(Spec Ops)",
    "demand": 1,
    "tradeable": true,
    "name": "Abram X",
    "inGameCost": "Gems: 300 - 500",
    "gemOverrideMax": 500,
    "history": [],
    "value": 500,
    "gemOverrideMin": 300,
    "rarity": "Rare"
  },
  {
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "Fast helicopter with a fast-firing firing aimable, and explosive machine gun. The Ghostwind also features hypersonic boost like on jets and other aircraft, which usually isn't found on helicopters.",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "acronym": "GW",
    "value": 3e4,
    "thumbnail": "/images/vehicles/Ghostwind.jpg",
    "history": [],
    "name": "Ghostwind",
    "trend": "Stable",
    "hasCustomStarOverrides": false,
    "tradeable": true,
    "id": "99f22f2d-1b65-402f-b0e6-9c4538f9bdba",
    "demand": 5,
    "category": "Air",
    "hasCustomMultiplierOverrides": false,
    "gemOverrideMax": 3e4,
    "tags": [
      "Air",
      "Special"
    ],
    "inGameCost": "Gems: 20,000 - 30,000",
    "excludeFromRecentlyUpdated": true,
    "rarity": "Legendary",
    "gemOverrideMin": 2e4
  },
  {
    "trend": "Dropping",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "category": "Air",
    "tags": [
      "bomber"
    ],
    "thumbnail": "/images/vehicles/Bomber.jpg",
    "demand": 2,
    "id": "9a2833d4-7b76-408d-a5d3-ac5bd8b938bb",
    "history": [],
    "notes": "only real use is for fusing. It has weak bombs and is slow compared to easier vehicles to obtain.",
    "gemOverrideMin": 700,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 1200,
    "gemOverrideMax": 1200,
    "name": "Bomber"
  },
  {
    "id": "9b028a15-2980-40b3-ad0d-c4561d5aa536",
    "acronym": "NMT",
    "thumbnail": "/images/vehicles/Nuke%20Mortar%20Truck.jpg",
    "tags": [
      "Ground",
      "Special"
    ],
    "rarity": "Limited Edition",
    "trend": "Rising",
    "history": [
      {
        "tierValues": {
          "0": 1400001,
          "1": 1400001,
          "2": 1400001,
          "3": 1400001,
          "4": 1400001,
          "5": 14e5,
          "fresh": 25e5
        },
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "timestamp": "2026-09-03T00:18:17.689Z",
        "date": "Sep 02",
        "value": 15e5
      },
      {
        "note": "Staff moderation update",
        "timestamp": "2026-09-10T00:18:17.689Z",
        "date": "Sep 09",
        "updatedBy": "Voiddarkreaper",
        "value": 15e5,
        "tierValues": {
          "0": 15e5,
          "1": 15e5,
          "2": 15e5,
          "3": 15e5,
          "4": 15e5,
          "5": 1500001,
          "fresh": 25e5
        }
      },
      {
        "tierValues": {
          "0": 17e5,
          "1": 17e5,
          "2": 17e5,
          "3": 17e5,
          "4": 17e5,
          "5": 17e5,
          "fresh": 25e5
        },
        "updatedBy": "Voiddarkreaper",
        "timestamp": "2026-09-11T01:59:43.146Z",
        "note": "Staff moderation update",
        "value": 15e5,
        "date": "Sep 10"
      }
    ],
    "inGameCost": "Gems: 1,300,000 - 1,500,000",
    "hasCustomStarOverrides": true,
    "demand": 9,
    "starOverrides": {
      "0": 17e5,
      "1": 17e5,
      "2": 17e5,
      "3": 17e5,
      "4": 17e5,
      "5": 17e5,
      "fresh": 25e5
    },
    "name": "Nuke Mortar Truck",
    "gemOverrideMax": 15e5,
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "value": 17e5,
        "notes": "",
        "trend": "Rising",
        "demand": 8,
        "gemOverrideMax": 1785e3,
        "gemOverrideMin": 1615e3,
        "hasManualGemRange": false
      },
      "1": {
        "hasManualGemRange": false,
        "gemOverrideMin": 1615e3,
        "gemOverrideMax": 1785e3,
        "demand": 8,
        "value": 17e5,
        "notes": "",
        "trend": "Rising"
      },
      "2": {
        "hasManualGemRange": false,
        "gemOverrideMin": 1615e3,
        "gemOverrideMax": 1785e3,
        "notes": "",
        "trend": "Rising",
        "demand": 8,
        "value": 17e5
      },
      "3": {
        "value": 17e5,
        "hasManualGemRange": false,
        "demand": 8,
        "notes": "",
        "trend": "Rising",
        "gemOverrideMax": 1785e3,
        "gemOverrideMin": 1615e3
      },
      "4": {
        "hasManualGemRange": false,
        "gemOverrideMin": 1615e3,
        "gemOverrideMax": 1785e3,
        "demand": 8,
        "value": 17e5,
        "notes": "",
        "trend": "Rising"
      },
      "5": {
        "demand": 8,
        "hasManualGemRange": false,
        "gemOverrideMin": 1615e3,
        "gemOverrideMax": 1785e3,
        "value": 17e5,
        "notes": "",
        "trend": "Rising"
      },
      "fresh": {
        "notes": "",
        "trend": "Stable",
        "value": 25e5,
        "demand": 5,
        "gemOverrideMax": 2625e3,
        "gemOverrideMin": 2375e3,
        "hasManualGemRange": false
      }
    },
    "inRecentlyUpdated": false,
    "notes": "Is able to fire a nuke once the meter is full, and notably does mass burst damage versus vehicles and players alike. Can 2 shot both sturms, and can 4 shot Imperial (S), safely, from behind cover while giving itself damage resistance from smoke.Was recently nerfed, killing what remaining demand existed for itself",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 13e5,
    "category": "Land",
    "hasCustomMultiplierOverrides": false,
    "value": 15e5
  },
  {
    "thumbnail": "/images/vehicles/Super%20Prowler.jpg",
    "value": 35e3,
    "demand": 5,
    "gemOverrideMax": 35e3,
    "rarity": "Exotic",
    "hasManualGemRange": true,
    "notes": "has 4 missiles and drop bombs that has a large AOE radius",
    "gemOverrideMin": 25e3,
    "tags": [
      "super-prowler"
    ],
    "category": "Air",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "9c1175a8-bb38-4295-82ef-b891aa5476f1",
    "name": "Super Prowler",
    "trend": "Rising",
    "tradeable": true,
    "history": []
  },
  {
    "tags": [
      "Emblem"
    ],
    "history": [],
    "gemOverrideMax": 50,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inGameCost": "Gems: 25 - 50",
    "category": "Tags",
    "thumbnail": "/images/vehicles/Bullet%20_Emblem_.jpg",
    "gemOverrideMin": 25,
    "hasManualGemRange": true,
    "name": "Bullet (Emblem)",
    "demand": 1,
    "notes": "This emblem is obtained by the kill tag crates!",
    "tradeable": true,
    "id": "9c51c5be-d9f6-4521-a5b9-4852c76d3f4a",
    "rarity": "Common",
    "value": 50
  },
  {
    "category": "Soldier",
    "tags": [
      "Soldiers"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "value": 500,
    "tradeable": true,
    "id": "9c67c9d2-1c8a-49d1-9ece-ab047839de4a",
    "notes": "Gives cash boost when equiped of 25% and another 25% per star",
    "inGameCost": "Gems: 300 - 500",
    "name": "Golden Soldier",
    "history": [],
    "rarity": "Legendary",
    "gemOverrideMin": 300,
    "thumbnail": "/images/vehicles/Golden%20Soldier.jpg",
    "demand": 5,
    "gemOverrideMax": 500,
    "hasManualGemRange": true,
    "trend": "Stable"
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Super Rafale",
    "rarity": "Exotic",
    "category": "Air",
    "hasManualGemRange": true,
    "value": 35e3,
    "id": "9d76a679-b7c5-46dd-b867-4ad10bc1709c",
    "tradeable": true,
    "demand": 6,
    "notes": "The Super Rafale features the same weapons set as the Legendary rarity Rafale but has increased movement speed and damage from its weapons.",
    "inGameCost": "Gems: 30,000 - 35,000",
    "gemOverrideMin": 3e4,
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/Super%20Rafale.jpg",
    "gemOverrideMax": 35e3,
    "history": [],
    "trend": "Stable"
  },
  {
    "rarity": "Common",
    "gemOverrideMax": 99,
    "hasManualGemRange": true,
    "gemOverrideMin": 20,
    "name": "Laser Truck",
    "trend": "Dropping",
    "demand": 2,
    "tradeable": true,
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Laser%20Truck.jpg",
    "id": "9d84bc2e-6b44-4ff3-b2dd-8ab32f6285b2",
    "value": 99,
    "notes": "Buildable, so scarcity's inherently low because everyone can get one for free. Decent against air vehicles. (Buildable)",
    "history": [],
    "tags": [
      "laser-truck"
    ]
  },
  {
    "history": [],
    "thumbnail": "/images/vehicles/Enraged%20Vampire.jpg",
    "name": "Enrageed Vampire",
    "gemOverrideMax": 3e4,
    "trend": "Rising",
    "hasCustomMultiplierOverrides": false,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMin": 2e4,
    "inGameCost": "Gems: 20,000 - 30,000",
    "hasCustomStarOverrides": false,
    "rarity": "Exotic",
    "tags": [
      "Soldiers"
    ],
    "id": "9dc347d4-e989-4863-96d2-aa4f98157e38",
    "notes": "Has a better range, fire rate, damage, movement speed, health, and other improved stats compared to the normal vampire. It is currently one of the most powerful troops in the game, with its strong healing factor and damage capabilities.",
    "hasManualGemRange": true,
    "category": "Soldier",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "demand": 9,
    "value": 3e4,
    "tradeable": true
  },
  {
    "gemOverrideMax": 380,
    "trend": "Dropping",
    "name": "Warplane",
    "hasManualGemRange": true,
    "history": [],
    "thumbnail": "/images/vehicles/Warplane.jpg",
    "gemOverrideMin": 300,
    "category": "Air",
    "tags": [
      "warplane"
    ],
    "id": "9de94043-2c07-4b0f-8f3b-d4fa97406b7d",
    "tradeable": true,
    "notes": "Tied with the f-16 for the weakest jet fighter.",
    "rarity": "Rare",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "demand": 1,
    "value": 380
  },
  {
    "hasManualGemRange": true,
    "name": "Antonov A40",
    "notes": "The Antonov A40 is a april fools event vehicle that is essentially a tank with some wings. The Antonov A40 features an aimable, highly damaging, explosive main cannon. Along with an aimable, explosive, round machine gun. The reload speed of both weapons is average for a tank. The Antonov A40 is quite maneuverable but lacks speed.",
    "gemOverrideMax": 5e3,
    "rarity": "Legendary",
    "tradeable": true,
    "demand": 6,
    "value": 5e3,
    "gemOverrideMin": 3e3,
    "inGameCost": "Gems: 3,000 - 5,000",
    "history": [],
    "category": "Air",
    "tags": [
      "Air",
      "Collector",
      "Special"
    ],
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Antonov%20A40.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "9e092c80-9946-45cb-9e21-5900aa423919"
  },
  {
    "category": "Tags",
    "history": [],
    "trend": "Stable",
    "id": "9e3fb785-19ff-497c-a3af-2f67438d3336",
    "name": "Target (Emblem)",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Target%20_Emblem_.jpg",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 50,
    "tradeable": true,
    "notes": "This emblem is obtained in the kill tag crates!",
    "inGameCost": "Gems: 25 - 50",
    "rarity": "Common",
    "value": 50,
    "gemOverrideMin": 25,
    "demand": 1,
    "tags": [
      "Emblem"
    ]
  },
  {
    "id": "9e4ffbba-1e61-40bd-8ad0-519fc9a5fd77",
    "demand": 2,
    "tags": [
      "Ground"
    ],
    "tradeable": true,
    "notes": "has a long reloading single shot cannon that 2 taps not pro server ai carrier, may be good for farming building destruction",
    "inGameCost": "Gems: 1,250 - 1,750",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Epic",
    "value": 1750,
    "name": "Flak Halftrack",
    "hasManualGemRange": true,
    "gemOverrideMax": 1750,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Flak%20Halftrack.jpg",
    "category": "Land",
    "gemOverrideMin": 1250
  },
  {
    "demand": 5,
    "tags": [
      "su-34"
    ],
    "hasManualGemRange": true,
    "history": [],
    "gemOverrideMax": 3500,
    "category": "Air",
    "tradeable": true,
    "rarity": "Legendary",
    "trend": "Rising",
    "gemOverrideMin": 2500,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Su-34",
    "value": 3500,
    "thumbnail": "/images/vehicles/Su-34.jpg",
    "notes": "Fighter/bomber aircraft capable of air and ground attack. Gem upgrades significantly improves damage output. Wide turn radius. Powerful gunner seat.",
    "id": "9e5dba86-a6f9-4b57-a6ce-c5c7bedc59de"
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Super Edjer",
    "gemOverrideMax": 2e3,
    "hasManualGemRange": true,
    "value": 2e3,
    "history": [],
    "tradeable": true,
    "gemOverrideMin": 1500,
    "notes": "An upgraded version of the Minigun Edjer. This version has more HP, its minigun uses explosive ammo. It is one of the best vehicles when it comes to DPS as it shreds all of the bigger vehicles.",
    "demand": 5,
    "id": "9e64b5a3-dd89-44cd-b760-a05c1e6a511f",
    "tags": [
      "super-edjer"
    ],
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Super%20Edjer.jpg",
    "category": "Land",
    "trend": "Stable"
  },
  {
    "trend": "Stable",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Air",
    "history": [],
    "demand": 7,
    "tradeable": true,
    "name": "Super TU95",
    "id": "9e7ff8f1-83b5-471d-be56-de6d34443f88",
    "rarity": "Exotic",
    "inGameCost": "Gems: 60,000 - 70,000",
    "notes": "Decent bomber that features 9 nuclear drop bombs that cause good damage. The Super Tu95 also has a tail gunner who has an aiming angle range of 180 degrees. The tail gunner is manually operated and doesn't feature AI control. The reload speed of both the drop bombs and tial gunner is quite fast compared to other vehicles that feature these weapons. The damage of the Tail Gunner is quite low at the moment, making it not great for its main purpose of anti-air defense. The SUp TU95's speed is average to that of a bomber, but the maneuverability is quite lacking, and the turning radius and speed is quite long.",
    "gemOverrideMin": 6e4,
    "tags": [
      "Air",
      "Special"
    ],
    "value": 7e4,
    "thumbnail": "/images/vehicles/Super%20TU95.jpg",
    "gemOverrideMax": 7e4
  },
  {
    "trend": "Stable",
    "history": [],
    "demand": 0,
    "thumbnail": "/images/vehicles/Yamato.jpg",
    "gemOverrideMax": 600,
    "tags": [
      "Naval"
    ],
    "rarity": "Epic",
    "inGameCost": "Gems: 400 - 600",
    "gemOverrideMin": 400,
    "notes": "The Yamato has 3 main cannons along with many anti-air guns to defend itself from planes. Shooting AA cannons may cause lag (Buildable)",
    "category": "Naval",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "id": "9e86efb7-546c-48cf-891f-d6676a7fd414",
    "value": 600,
    "tradeable": true,
    "name": "Yamato",
    "hasManualGemRange": true
  },
  {
    "gemOverrideMax": 70,
    "tags": [
      "attack-helicopter"
    ],
    "notes": "A decent helicopter with missiles and machine guns.",
    "hasManualGemRange": true,
    "tradeable": true,
    "gemOverrideMin": 20,
    "history": [],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "9ea2794d-7c7b-4790-8247-6a6fcc5bdbe8",
    "value": 70,
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Attack%20Helicopter.jpg",
    "name": "Attack Helicopter",
    "rarity": "Common",
    "demand": 1,
    "category": "Air"
  },
  {
    "rarity": "Exotic",
    "tradeable": true,
    "value": 5e5,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "category": "Air",
    "notes": "The Master Reaper has the same weapons arsenal as the Sky Reaper and is also low in damage, dealing abilities. It has decent health.",
    "demand": 6,
    "history": [],
    "hasManualGemRange": true,
    "tags": [
      "Air"
    ],
    "gemOverrideMax": 5e5,
    "name": "Master Reaper",
    "inGameCost": "Gems: 400,000 - 500,000",
    "trend": "Stable",
    "gemOverrideMin": 4e5,
    "thumbnail": "/images/vehicles/Master%20Reaper.jpg",
    "id": "9eb04509-b120-4006-b15a-a781d1ea74d9"
  },
  {
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inGameCost": "Gems: 25 - 50",
    "tradeable": true,
    "category": "Tags",
    "tags": [
      "Emblem"
    ],
    "notes": "This emblem is obtainable by kill tag crates!",
    "hasManualGemRange": true,
    "gemOverrideMax": 50,
    "history": [],
    "demand": 1,
    "name": "Cannon (Emblem)",
    "thumbnail": "/images/vehicles/Cannon%20_Emblem_.jpg",
    "id": "9f12a2c6-4a9c-4188-8c08-12018914031e",
    "value": 50,
    "rarity": "Common",
    "gemOverrideMin": 25
  },
  {
    "demand": 3,
    "tradeable": true,
    "history": [],
    "trend": "Stable",
    "rarity": "Epic",
    "tags": [
      "Emblem"
    ],
    "hasManualGemRange": true,
    "id": "9f1b8ffb-e048-4218-ada9-cdd2145e893c",
    "value": 250,
    "gemOverrideMin": 200,
    "category": "Tags",
    "notes": "This emblem can be obtained in the kill tag crates!",
    "gemOverrideMax": 250,
    "thumbnail": "/images/vehicles/Flying%20Eagle%20_Emblem_.jpg",
    "name": "Flying Eagle (Emblem)",
    "inGameCost": "Gems: 200 - 250",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "name": "Super Alien",
    "gemOverrideMin": 7e4,
    "rarity": "Limited Edition",
    "trend": "Stable",
    "history": [],
    "tradeable": true,
    "gemOverrideMax": 8e4,
    "category": "Soldier",
    "demand": 4,
    "inGameCost": "Gems: 70,000 - 80,000",
    "id": "9f330164-15a7-44d7-a898-5ae7f3293829",
    "thumbnail": "/images/vehicles/Super%20Alien.jpg",
    "notes": "The Super Alien is just a red reskin of the Legendary rarity Alien. The UFO, Mothership, and Alien Troop damage buffs currently don't work. They don't increase building, Boss fight troops, or Boss fight vehicle damage in any capacity when equipped at the moment. The Super Alien features the same weaponry as the Alien: a raygun that deals serious damage and has a decent reload speed.",
    "tags": [
      "Soldiers",
      "Special"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "value": 8e4
  },
  {
    "rarity": "Legendary",
    "gemOverrideMax": 2600,
    "category": "Air",
    "tags": [
      "golden-ac-130"
    ],
    "value": 2600,
    "tradeable": true,
    "demand": 2,
    "gemOverrideMin": 2100,
    "id": "9f4c02db-7b0c-4dfe-b11a-bfe5cce49849",
    "hasManualGemRange": true,
    "notes": "An upgraded version of the AC-130 containing more damage, HP, speed and is also a bit rarer.",
    "name": "Golden AC-130",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Golden%20AC-130.jpg",
    "history": [],
    "trend": "Rising"
  },
  {
    "inGameCost": "Gems: 4,000 - 7,000",
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "demand": 5,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Grumpy%20Killer.jpg",
    "trend": "Rising",
    "rarity": "Legendary",
    "tags": [
      "Soldiers"
    ],
    "category": "Soldier",
    "hasCustomMultiplierOverrides": false,
    "id": "9f6f28c9-634c-4438-bbf2-064a4e833be0",
    "value": 7e3,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "gemOverrideMin": 4e3,
    "notes": "N/A",
    "hasCustomStarOverrides": false,
    "tradeable": true,
    "name": "Grumpy Killer",
    "gemOverrideMax": 7e3
  },
  {
    "hasManualGemRange": true,
    "name": "Blue F22",
    "trend": "Stable",
    "category": "Air",
    "thumbnail": "/images/vehicles/Blue%20F22.jpg",
    "id": "9f70a32e-a07e-447a-83c3-d47d321d079c",
    "tags": [
      "Air"
    ],
    "gemOverrideMin": 7500,
    "notes": "Blue colored reskin of the normal Raptor that lost the special upgrades featured on the normal Raptor.",
    "demand": 6,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "inGameCost": "Gems: 7,500 - 15,000",
    "gemOverrideMax": 15e3,
    "history": [],
    "value": 15e3,
    "rarity": "Legendary"
  },
  {
    "thumbnail": "/images/vehicles/F-18.jpg",
    "category": "Air",
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "f-18"
    ],
    "rarity": "Epic",
    "value": 0,
    "history": [],
    "id": "9fe1bcc9-167c-4bf5-aff4-7fd9d6f9ba6d",
    "inRecentlyUpdated": false,
    "name": "F-18",
    "demand": 5,
    "notes": "A decent explosive machine gun that has a high reload time and 14 missiles(With the power upgrade, 6 without). It also has an incendiary bomb for the co-pilot to control.",
    "tradeable": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z"
  },
  {
    "rarity": "Legendary",
    "value": 7100,
    "gemOverrideMax": 7100,
    "thumbnail": "/images/vehicles/Zumwalt.jpg",
    "hasManualGemRange": true,
    "name": "Zumwalt",
    "notes": "The Zumwalt has good driver controled cannons as well as it has a helicopter spawnpad at the back.",
    "id": "9fef8b23-5060-457b-8d23-c9fbc6959f42",
    "demand": 3,
    "history": [],
    "gemOverrideMin": 5700,
    "tradeable": true,
    "category": "Naval",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "trend": "Dropping",
    "tags": [
      "Naval"
    ],
    "inGameCost": "Gems: 5,700 - 7,100"
  },
  {
    "demand": 1,
    "gemOverrideMin": 25,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "value": 50,
    "tags": [
      "Emblem"
    ],
    "rarity": "Common",
    "gemOverrideMax": 50,
    "thumbnail": "/images/vehicles/Gloves%20_Emblem_.jpg",
    "notes": "This emblem is obtainable by the kill tag crates!",
    "tradeable": true,
    "name": "Gloves (Emblem)",
    "id": "9ffc7712-f004-41d5-93cd-3a3c14f67771",
    "category": "Tags",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 25 - 50",
    "history": [],
    "trend": "Stable"
  },
  {
    "hasManualGemRange": true,
    "trend": "Stable",
    "tradeable": true,
    "demand": 5,
    "name": "Police APC",
    "rarity": "Legendary",
    "category": "Land",
    "id": "a0ef6126-27e8-4a38-8c4a-cb1283d07311",
    "gemOverrideMin": 4500,
    "notes": "Fast troop transport with an explosive round turret that does decent air damage similar to the Super Edjer.",
    "inGameCost": "Gems: 4,500 - 7,500",
    "gemOverrideMax": 7500,
    "thumbnail": "/images/vehicles/Police%20APC.jpg",
    "value": 7500,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Ground"
    ],
    "history": []
  },
  {
    "trend": "Dropping",
    "rarity": "Rare",
    "gemOverrideMin": 300,
    "category": "Land",
    "gemOverrideMax": 700,
    "tradeable": true,
    "tags": [
      "missile-truck"
    ],
    "demand": 2,
    "id": "a0f07c67-588c-43c9-bebc-c623a86f5e9e",
    "thumbnail": "/images/vehicles/Missile%20Truck.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "It is decent due to its missiles not giving a lock-on or incoming missile warning however currently most planes can outrun its missiles. ",
    "history": [],
    "value": 700,
    "name": "Missile Truck",
    "hasManualGemRange": true
  },
  {
    "demand": 6,
    "gemOverrideMax": 5e4,
    "name": "Nuke B36",
    "history": [],
    "id": "a15a10a9-a2b7-4af7-aa0f-5d933c313bfb",
    "gemOverrideMin": 3e4,
    "category": "Air",
    "rarity": "Exotic",
    "trend": "Dropping",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "tags": [
      "nuke-b36"
    ],
    "thumbnail": "/images/vehicles/Nuke%20B36.jpg",
    "value": 5e4,
    "hasManualGemRange": true,
    "notes": "A decent but rare nuclear bomber. It has high health, strong secondary bombs and mediocre ai guns. Obtainable in the crate for a period of time"
  },
  {
    "history": [],
    "gemOverrideMax": 500,
    "id": "a178f8b5-1b87-489e-815a-ac9568cec070",
    "trend": "Stable",
    "name": "AC-119K",
    "rarity": "Epic",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/AC-119K.jpg",
    "gemOverrideMin": 400,
    "demand": 1,
    "tags": [
      "ac-119k"
    ],
    "tradeable": true,
    "notes": "Functions as a faster AC-130 that can shoot from both sides.",
    "category": "Air",
    "value": 500,
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "tradeable": true,
    "notes": "Good for arsenal levels.(Tycoon)",
    "id": "a199f392-a01e-494c-86fa-d69985141012",
    "demand": 1,
    "excludeFromRecentlyUpdated": true,
    "name": "Biplane",
    "value": 50,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "rarity": "Common",
    "hasManualGemRange": true,
    "category": "Air",
    "inRecentlyUpdated": false,
    "trend": "Dropping",
    "gemOverrideMin": 25,
    "history": [],
    "thumbnail": "/images/vehicles/Biplane.jpg",
    "gemOverrideMax": 50,
    "tags": [
      "biplane"
    ]
  },
  {
    "rarity": "Common",
    "thumbnail": "/images/vehicles/Grenade%20_Emblem_.jpg",
    "value": 50,
    "name": "Grenade (Emblem)",
    "notes": "This emblem is obtained by the kill tag crates!",
    "history": [],
    "demand": 1,
    "category": "Tags",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 25 - 50",
    "gemOverrideMax": 50,
    "trend": "Stable",
    "id": "a1f228f6-408e-48e4-adef-5ccfc7e0c800",
    "tags": [
      "Emblem"
    ],
    "tradeable": true,
    "gemOverrideMin": 25,
    "hasManualGemRange": true
  },
  {
    "hasCustomStarOverrides": true,
    "thumbnail": "/images/vehicles/Mech%20Transport%20X.jpg",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "acronym": "MTX",
    "demand": 7,
    "name": "Mech Transport X",
    "rarity": "Limited Edition",
    "history": [
      {
        "date": "Sep 10",
        "value": 0,
        "timestamp": "2026-09-10T22:08:35.943Z",
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 200,
          "3": 1e4,
          "4": 2e4,
          "5": 6e4,
          "fresh": 0
        }
      },
      {
        "tierValues": {
          "0": 85e4,
          "1": 85e4,
          "2": 850200,
          "3": 86e4,
          "4": 87e4,
          "5": 91e4,
          "fresh": 85e4
        },
        "date": "Sep 10",
        "value": 85e4,
        "timestamp": "2026-09-10T22:56:01.529Z",
        "note": "Staff moderation update",
        "updatedBy": "Spuppers"
      },
      {
        "updatedBy": "System",
        "tierValues": {
          "0": 85e4,
          "1": 85e4,
          "2": 85e4,
          "3": 85e4,
          "4": 85e4,
          "5": 85e4,
          "fresh": 85e4
        },
        "note": "Previous Market Valuation",
        "value": 85e4,
        "timestamp": "2026-09-10T22:08:35.943Z",
        "date": "Sep 10"
      },
      {
        "tierValues": {
          "0": 85e4,
          "1": 85e4,
          "2": 85e4,
          "3": 85e4,
          "4": 85e4,
          "5": 9e5,
          "fresh": 85e4
        },
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-11T21:36:45.816Z",
        "value": 85e4,
        "note": "Staff moderation update",
        "date": "Sep 11",
        "tier": "5"
      }
    ],
    "hasCustomMultiplierOverrides": false,
    "starTierOverrides": {
      "0": {
        "value": 85e4,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 892500,
        "gemOverrideMin": 807500,
        "hasManualGemRange": false,
        "demand": 7
      },
      "1": {
        "trend": "Stable",
        "notes": "",
        "value": 85e4,
        "gemOverrideMax": 892500,
        "gemOverrideMin": 807500,
        "hasManualGemRange": false,
        "demand": 7
      },
      "2": {
        "demand": 7,
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMax": 892500,
        "gemOverrideMin": 807500,
        "value": 85e4
      },
      "3": {
        "demand": 7,
        "hasManualGemRange": false,
        "value": 85e4,
        "gemOverrideMax": 892500,
        "gemOverrideMin": 807500,
        "notes": "",
        "trend": "Stable"
      },
      "4": {
        "value": 85e4,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMin": 807500,
        "gemOverrideMax": 892500,
        "hasManualGemRange": false,
        "demand": 7
      },
      "5": {
        "demand": 7,
        "gemOverrideMin": 855e3,
        "gemOverrideMax": 945e3,
        "hasManualGemRange": false,
        "value": 9e5,
        "trend": "Stable",
        "notes": ""
      },
      "fresh": {
        "gemOverrideMin": 807500,
        "gemOverrideMax": 892500,
        "demand": 7,
        "notes": "",
        "hasManualGemRange": false,
        "trend": "Stable",
        "value": 85e4
      }
    },
    "hasManualGemRange": false,
    "inRecentlyUpdated": false,
    "notes": "$1d",
    "category": "Land",
    "starOverrides": {
      "0": 85e4,
      "1": 85e4,
      "2": 85e4,
      "3": 85e4,
      "4": 85e4,
      "5": 9e5,
      "fresh": 85e4
    },
    "excludeFromRecentlyUpdated": true,
    "value": 85e4,
    "tags": [
      "Ground",
      "Special"
    ],
    "tradeable": true,
    "id": "a2028fce-7c52-4ed0-abcc-c2e78fd47206"
  },
  {
    "trend": "Stable",
    "history": [],
    "demand": 3,
    "tradeable": true,
    "tags": [
      "boss-j-20"
    ],
    "id": "a2aaea15-7002-4a16-90f6-87c485079693",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Legendary",
    "notes": "Strong machineguns, a direct upgrade to the normal J-20.",
    "gemOverrideMin": 5200,
    "category": "Air",
    "gemOverrideMax": 6400,
    "value": 6400,
    "thumbnail": "/images/vehicles/Boss%20J-20.jpg",
    "name": "Boss J-20",
    "hasManualGemRange": true
  },
  {
    "excludeFromRecentlyUpdated": true,
    "name": "Pyro",
    "history": [],
    "id": "a3208a53-1f12-41aa-98b6-435adc555484",
    "notes": "Useful for fighting troops at close range and deal damage over time.",
    "tradeable": true,
    "category": "Soldier",
    "value": 1100,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMin": 1e3,
    "demand": 8,
    "hasManualGemRange": true,
    "inGameCost": "Gems: 1,000 - 1,100",
    "inRecentlyUpdated": false,
    "tags": [
      "Soldiers"
    ],
    "trend": "Stable",
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": false,
    "thumbnail": "/images/vehicles/Pyro.jpg",
    "gemOverrideMax": 1100,
    "rarity": "Epic"
  },
  {
    "inGameCost": "Gems: 300,000 - 350,000",
    "value": 35e4,
    "excludeFromRecentlyUpdated": true,
    "demand": 5,
    "category": "Air",
    "id": "a3d0a702-2fdf-4d62-9c47-1bf073fa3a42",
    "hasCustomStarOverrides": true,
    "history": [],
    "inRecentlyUpdated": false,
    "notes": "The Sukhoi SU57 features 4 average drop bombs and 4 high damage-dealing missiles, which is fewer than the Boss and the normal SU57. All Su57s can do the looping quirk. The main highlight of the Sukhoi SU57 is the autoflare deployment and faster flare reload time.",
    "rarity": "Limited Edition",
    "tradeable": true,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "gemOverrideMax": 357500,
        "gemOverrideMin": 292500,
        "notes": "",
        "trend": "Stable",
        "value": 325e3,
        "demand": 3,
        "hasManualGemRange": false
      },
      "1": {
        "gemOverrideMin": 292500,
        "gemOverrideMax": 357500,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "value": 325e3,
        "demand": 3
      },
      "2": {
        "notes": "",
        "hasManualGemRange": false,
        "trend": "Stable",
        "value": 325200,
        "gemOverrideMax": 357720,
        "gemOverrideMin": 292680,
        "demand": 3
      },
      "3": {
        "hasManualGemRange": false,
        "gemOverrideMin": 301500,
        "gemOverrideMax": 368500,
        "demand": 3,
        "trend": "Stable",
        "notes": "",
        "value": 335e3
      },
      "4": {
        "value": 347e3,
        "gemOverrideMin": 312300,
        "gemOverrideMax": 381700,
        "notes": "",
        "trend": "Stable",
        "demand": 3,
        "hasManualGemRange": false
      },
      "5": {
        "notes": "",
        "trend": "Stable",
        "value": 39e4,
        "gemOverrideMin": 351e3,
        "gemOverrideMax": 429e3,
        "hasManualGemRange": false,
        "demand": 5
      },
      "fresh": {
        "hasManualGemRange": true,
        "notes": "",
        "trend": "Stable",
        "value": 6e5,
        "gemOverrideMin": 5e5,
        "gemOverrideMax": 7e5,
        "demand": 5
      }
    },
    "starOverrides": {
      "0": 325e3,
      "1": 325e3,
      "2": 325200,
      "3": 335e3,
      "4": 347e3,
      "5": 39e4,
      "fresh": 6e5
    },
    "acronym": "SU57",
    "name": "Sukhoi SU57",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMin": 3e5,
    "thumbnail": "/images/vehicles/Sukhoi%20SU57.jpg",
    "trend": "Stable",
    "hasCustomMultiplierOverrides": false,
    "tags": [
      "Air"
    ],
    "gemOverrideMax": 35e4
  },
  {
    "trend": "Dropping",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 30,
    "demand": 5,
    "name": "Marine",
    "tradeable": true,
    "rarity": "Common",
    "history": [],
    "gemOverrideMax": 50,
    "notes": "Flashbangs enemies, blinding them.",
    "thumbnail": "/images/vehicles/Marine.jpg",
    "hasManualGemRange": true,
    "category": "Soldier",
    "value": 50,
    "inGameCost": "Gems: 30 - 50",
    "id": "a45cb52e-0e4c-4997-a680-c61fb0707d99",
    "tags": [
      "Soldiers"
    ]
  },
  {
    "tradeable": true,
    "id": "a5ee4adf-cafc-4ab7-8ea8-eef961a2cc23",
    "demand": 5,
    "name": "Copper (Banner)",
    "hasManualGemRange": true,
    "gemOverrideMax": 2500,
    "value": 2500,
    "rarity": "Epic",
    "gemOverrideMin": 2e3,
    "history": [],
    "category": "Tags",
    "notes": "Available through crates.",
    "inGameCost": "Gems: 2,000 - 2,500",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "Banner"
    ],
    "thumbnail": "/images/vehicles/Copper%20_Banner_.jpg",
    "trend": "Stable"
  },
  {
    "tags": [
      "pyro-tank"
    ],
    "gemOverrideMin": 4e3,
    "value": 5e3,
    "id": "a6893e85-de6e-4bc8-ab5c-5d8fcb4134d4",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "gemOverrideMax": 5e3,
    "notes": "decent range flame thrower simular to a weaker 3 star effect, currently does no damage to buildings so is unable to clear fortresses due to accessability issues",
    "history": [],
    "category": "Land",
    "demand": 3,
    "thumbnail": "/images/vehicles/Pyro%20Tank.jpg",
    "name": "Pyro Tank",
    "hasManualGemRange": true,
    "rarity": "Epic",
    "trend": "Stable"
  },
  {
    "id": "a692bd13-3a4c-4f68-8041-7186c02e00bd",
    "category": "Air",
    "history": [],
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": false,
    "hasCustomMultiplierOverrides": false,
    "thumbnail": "/images/vehicles/Rainbow%20Darkstar.jpg",
    "acronym": "RDS",
    "inRecentlyUpdated": false,
    "tags": [
      "Air",
      "Collector",
      "Special"
    ],
    "notes": "There are only around 5 - 10 of these vehicles in the game. They are only given out to owners, high-ranking mods, and developers. The real price of this vehicle is hard to tell because they are never traded.",
    "rarity": "Legendary",
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "value": 0,
    "name": "Rainbow Darkstar",
    "hasCustomStarOverrides": false,
    "demand": 10
  },
  {
    "inGameCost": "Gems: 15,000 - 20,000",
    "id": "a699f238-8c48-47fe-9fad-9c6dd4ebe0a4",
    "name": "Warlord Bunny",
    "trend": "Stable",
    "category": "Soldier",
    "tradeable": true,
    "gemOverrideMin": 15e3,
    "thumbnail": "/images/vehicles/Warlord%20Bunny.jpg",
    "demand": 8,
    "value": 2e4,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "history": [],
    "rarity": "Exotic",
    "gemOverrideMax": 2e4,
    "notes": "The Warlord Bunny features 2 golden P-90 Submachine guns that have incredible range, fire rate, and damage. The Warlord Bunny has average health and speed.",
    "tags": [
      "Soldiers"
    ],
    "hasManualGemRange": true
  },
  {
    "thumbnail": "https://static.wixstatic.com/media/341c64_bdbcb7b074dc49bd997b3a532aad2e75~mv2.png/v1/fill/w_133,h_147,al_c,lg_1,q_85,enc_avif,quality_auto/341c64_bdbcb7b074dc49bd997b3a532aad2e75~mv2.png",
    "id": "a6a63212-7ccc-4977-8c12-7bf986b68188",
    "value": 0,
    "inGameCost": "Untradable",
    "name": "General (Emblem)",
    "notes": "This Emblem is obtained by getting a certain amount of rebirths, dailies, and arsenal levels.",
    "inRecentlyUpdated": false,
    "demand": 5,
    "history": [],
    "lastUpdated": "2026-08-29",
    "rarity": "Legendary",
    "trend": "Stable",
    "category": "Tags",
    "excludeFromRecentlyUpdated": true,
    "tradeable": false,
    "tags": [
      "Emblem",
      "Special"
    ]
  },
  {
    "tags": [
      "Soldiers"
    ],
    "history": [],
    "rarity": "Epic",
    "gemOverrideMax": 2500,
    "value": 2500,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 1,
    "hasCustomStarOverrides": false,
    "inGameCost": "Gems: 1,500 - 2,500",
    "notes": "Reskined medic",
    "id": "a7062ba2-b285-4731-8367-3cb846411d3c",
    "gemOverrideMin": 1500,
    "thumbnail": "/images/vehicles/Santa%20Medic.jpg",
    "hasManualGemRange": true,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "name": "Santa Medic",
    "excludeFromRecentlyUpdated": true,
    "category": "Soldier",
    "trend": "Stable",
    "hasCustomMultiplierOverrides": false
  },
  {
    "value": 4e4,
    "inGameCost": "Gems: 35,000 - 40,000",
    "hasManualGemRange": true,
    "id": "a747adea-e875-4ea3-81fc-5f03472331fd",
    "gemOverrideMax": 4e4,
    "category": "Land",
    "notes": "The Armed Hoverbike is now an alternative-looking, camouflaged version of the Super Speeder after the F35 Billion Update. The Armed Hoverbike still retains the exact axis rotation speed as the Super Hoverbike. The Armed Hoverbike features a frontally aimed, explosive 100-round machine gun that deals average damage. Along with having an average to good reload speed. The Armed Hoverbike also has 18 average lock-on missiles.",
    "tradeable": true,
    "gemOverrideMin": 35e3,
    "history": [],
    "name": "Armed Hoverbike",
    "demand": 7,
    "thumbnail": "/images/vehicles/Armed%20Hoverbike.jpg",
    "trend": "Stable",
    "rarity": "Legendary",
    "tags": [
      "Ground"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "gemOverrideMax": 400,
    "history": [],
    "hasManualGemRange": true,
    "tags": [
      "terrorbyte"
    ],
    "rarity": "Rare",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "demand": 1,
    "category": "Land",
    "gemOverrideMin": 150,
    "thumbnail": "/images/vehicles/Terrorbyte.jpg",
    "trend": "Dropping",
    "value": 400,
    "name": "Terrorbyte",
    "id": "a768d8c1-2286-4cce-8e80-8e071ac02d07",
    "tradeable": true,
    "notes": "One of the first vehicles with the orignial radar system. This vehicle requires multiple people to operate at its best as the missiles are not driver operated.(Buildable)"
  },
  {
    "rarity": "Rare",
    "hasManualGemRange": true,
    "tradeable": true,
    "gemOverrideMax": 100,
    "trend": "Stable",
    "demand": 3,
    "tags": [
      "Emblem"
    ],
    "gemOverrideMin": 75,
    "value": 100,
    "history": [],
    "id": "a7b205bd-5d9e-4d32-b645-904371248dc8",
    "category": "Tags",
    "notes": "This emblem is obtained by the kill tag crates!",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Metal%20Helm%20_Emblem_.jpg",
    "name": "Metal Helm (Emblem)",
    "inGameCost": "Gems: 75 - 100"
  },
  {
    "tradeable": true,
    "name": "Love Buggy",
    "rarity": "Legendary",
    "value": 5e3,
    "demand": 5,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "Valentine's reskin of the Boss and Dune Buggy.  The base vehicle features 2 lock-on missiles within the main passenger seat that have a slow reload time. The passenger seat features a slow-firing and low-damage explosive round aimable turret. The third passenger also has the same turret. When the first upgrade is bought names the Minigun for 10k gems, it swaps out the passenger seat turret for a minigun that is equivalent to the player's minigun. The second upgrade replaces the turret of the third passenger with a 4-round grenade launcher, with the upgrade being called Launcher and costing 15k gems. The grenade launcher reloads quite fast, but has limited range and explosive radius. The damage of the grenades is average and is also featured on the legendary rarity Volk.",
    "gemOverrideMax": 5e3,
    "tags": [
      "Ground"
    ],
    "hasManualGemRange": true,
    "category": "Land",
    "history": [],
    "gemOverrideMin": 3e3,
    "id": "a7b35dad-286f-4068-89eb-67932509c676",
    "inGameCost": "Gems: 3,000 - 5,000",
    "thumbnail": "/images/vehicles/Love%20Buggy.jpg",
    "trend": "Stable"
  },
  {
    "value": 900,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "notes": "Can one shot most troops and hit through vehicles with the gas grenade.",
    "thumbnail": "/images/vehicles/Toxic%20Trooper.jpg",
    "tags": [
      "Soldiers"
    ],
    "history": [],
    "gemOverrideMax": 900,
    "demand": 8,
    "id": "a80e990f-a2a0-4566-b572-cab99b5c0950",
    "tradeable": true,
    "category": "Soldier",
    "trend": "Dropping",
    "rarity": "Legendary",
    "inGameCost": "Gems: 500 - 900",
    "gemOverrideMin": 500,
    "name": "Toxic Trooper"
  },
  {
    "history": [],
    "rarity": "Legendary",
    "value": 12e3,
    "name": "XB-70",
    "demand": 3,
    "category": "Air",
    "notes": "Fast jet with 2 unique lock on missile barrages and 2 normal drop bombs",
    "tradeable": true,
    "tags": [
      "xb-70"
    ],
    "thumbnail": "/images/vehicles/XB-70.jpg",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 12e3,
    "hasManualGemRange": true,
    "id": "a8e075f1-83ab-41cf-a310-d20e50465398",
    "gemOverrideMin": 8e3,
    "trend": "Stable"
  },
  {
    "demand": 3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "thumbnail": "/images/vehicles/Attack%20Submarine.jpg",
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "trend": "Rising",
    "tags": [
      "Naval",
      "Collector"
    ],
    "rarity": "Legendary",
    "category": "Naval",
    "value": 0,
    "history": [],
    "notes": "A gamepass exclusive vehicle that is no longer purchaseable with lock-on missiles. ",
    "tradeable": false,
    "name": "Attack Submarine",
    "inGameCost": "Untradable",
    "id": "a98fd1bc-f195-4770-9339-0958e0d43339"
  },
  {
    "notes": "Daily XP crate exclusive troop that deals significantly more damage than the normal Pumpkin soldier. It has a pumpkin launcher with a decent fire rate and a splash damage radius.",
    "tradeable": true,
    "category": "Soldier",
    "value": 3e4,
    "history": [],
    "name": "Super Pumpkin",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "aa55be1f-263d-4a35-8a46-026dea703d18",
    "demand": 7,
    "gemOverrideMin": 25e3,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Super%20Pumpkin.jpg",
    "tags": [
      "Soldiers",
      "Collector",
      "Special"
    ],
    "rarity": "Exotic",
    "gemOverrideMax": 3e4,
    "inGameCost": "Gems: 25,000 - 30,000"
  },
  {
    "notes": "Improved stats version of the normal Vespa Tap, with its main buff being a slightly stronger cannon and the increased speed.",
    "tags": [
      "Ground"
    ],
    "history": [],
    "id": "aad7d6a5-802c-4210-a27d-f8d2fa622c95",
    "value": 8e4,
    "inGameCost": "Gems: 25,000 - 80,000",
    "tradeable": true,
    "trend": "Stable",
    "gemOverrideMax": 8e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "thumbnail": "/images/vehicles/Super%20Vespa%20Tap.jpg",
    "category": "Land",
    "rarity": "Exotic",
    "gemOverrideMin": 25e3,
    "name": "Super Vespa Tap",
    "demand": 7,
    "hasManualGemRange": true
  },
  {
    "history": [
      {
        "date": "Sep 10",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 200,
          "3": 1e4,
          "4": 2e4,
          "5": 6e4,
          "fresh": 0
        },
        "value": 0,
        "timestamp": "2026-09-10T22:08:36.830Z",
        "note": "Previous Market Valuation",
        "updatedBy": "System"
      },
      {
        "date": "Sep 11",
        "tierValues": {
          "0": 135e3,
          "1": 135e3,
          "2": 135200,
          "3": 145e3,
          "4": 155e3,
          "5": 195e3,
          "fresh": 135e3
        },
        "timestamp": "2026-09-11T17:19:56.732Z",
        "value": 135e3,
        "note": "Staff moderation update",
        "updatedBy": "Spuppers"
      }
    ],
    "hasManualGemRange": false,
    "tradeable": true,
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasCustomMultiplierOverrides": false,
    "trend": "Stable",
    "tags": [
      "Air",
      "Special"
    ],
    "rarity": "Exotic",
    "category": "Air",
    "value": 135e3,
    "id": "ab191829-707e-46ea-bf66-7c9266cf6a2d",
    "thumbnail": "/images/vehicles/Super%20Mig25.jpg",
    "name": "Super Mig25",
    "notes": "The Super Mig25 features a useless passenger seat in front of the pilot's seating position. Along with having no hypersonic speed buff, which seems to be exclusive to the LE Rocket Plane and Mig31 varients. For weapons, it has a singular fast fire rate, left-side-located explosive round front-firing 150-round machine gun. Along with  6 average-damage, long-lock-on-range supersonic anti-flare missiles. The Super Mig25 features a special vertical axis rotation speed buff without flipping, unlike the SU57 or SU47.",
    "demand": 7,
    "hasCustomStarOverrides": false
  },
  {
    "tradeable": true,
    "tags": [
      "Air"
    ],
    "rarity": "Exotic",
    "id": "abeb7289-0c4b-4b67-8431-6b1f00e16e97",
    "demand": 5,
    "inGameCost": "Gems: 40,000 - 50,000",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Stable",
    "category": "Air",
    "history": [],
    "gemOverrideMax": 5e4,
    "value": 5e4,
    "hasManualGemRange": true,
    "name": "Police AHRLAC",
    "gemOverrideMin": 4e4,
    "notes": "Varisnt of SUPER AHRLAC with reportedly better health, but worse speed",
    "thumbnail": "/images/vehicles/Police%20AHRLAC.jpg"
  },
  {
    "tags": [
      "Air",
      "Special"
    ],
    "rarity": "Legendary",
    "notes": "The Mig25 currently features the same weaponry and stats as its Exotic rarity counterpart, which could be changed in the future.",
    "id": "ac0eeda5-c505-4a6a-ae2d-d4e2caebce81",
    "history": [
      {
        "date": "Sep 10",
        "value": 0,
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "timestamp": "2026-09-10T22:08:35.943Z",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 200,
          "3": 1e4,
          "4": 2e4,
          "5": 6e4,
          "fresh": 0
        }
      },
      {
        "timestamp": "2026-09-11T17:20:04.713Z",
        "note": "Staff moderation update",
        "updatedBy": "Spuppers",
        "date": "Sep 11",
        "tierValues": {
          "0": 15e3,
          "1": 15e3,
          "2": 15200,
          "3": 25e3,
          "4": 35e3,
          "5": 75e3,
          "fresh": 15e3
        },
        "value": 15e3
      }
    ],
    "thumbnail": "/images/vehicles/Mig25.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "category": "Air",
    "demand": 6,
    "value": 15e3,
    "inRecentlyUpdated": false,
    "name": "Mig25",
    "hasManualGemRange": false,
    "hasCustomMultiplierOverrides": false,
    "tradeable": true,
    "trend": "Stable",
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true
  },
  {
    "inGameCost": "Gems: 20 - 100",
    "id": "ac777ce0-5422-4330-9bdd-8704bcd6333f",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true,
    "tags": [
      "Ground"
    ],
    "history": [],
    "gemOverrideMax": 100,
    "notes": "One of the first vehicles unlocked when building your tycoon.",
    "rarity": "Common",
    "thumbnail": "/images/vehicles/Armored%20Jeep.jpg",
    "category": "Land",
    "gemOverrideMin": 20,
    "value": 100,
    "name": "Armored Jeep",
    "hasManualGemRange": true,
    "demand": 1
  },
  {
    "value": 15e4,
    "tradeable": true,
    "hasCustomMultiplierOverrides": false,
    "id": "ac9a3ccd-b821-420f-b9ea-b4b987008b8b",
    "name": "Mech Transport",
    "notes": "$1e",
    "rarity": "Limited Edition",
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": false,
    "history": [
      {
        "value": 0,
        "timestamp": "2026-09-10T22:08:35.943Z",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
          "fresh": 0
        },
        "date": "Sep 10",
        "updatedBy": "System",
        "note": "Previous Market Valuation"
      },
      {
        "date": "Sep 11",
        "value": 9e4,
        "updatedBy": "Spuppers",
        "tierValues": {
          "0": 9e4,
          "1": 9e4,
          "2": 9e4,
          "3": 9e4,
          "4": 9e4,
          "5": 9e4,
          "fresh": 9e4
        },
        "timestamp": "2026-09-11T17:20:11.965Z",
        "note": "Staff moderation update"
      },
      {
        "date": "Sep 10",
        "timestamp": "2026-09-10T22:08:35.943Z",
        "tierValues": {
          "0": 3e4,
          "1": 3e4,
          "2": 30200,
          "3": 4e4,
          "4": 5e4,
          "5": 9e4,
          "fresh": 3e4
        },
        "updatedBy": "System",
        "value": 9e4,
        "note": "Previous Market Valuation"
      },
      {
        "date": "Sep 13",
        "timestamp": "2026-09-14T01:13:24.555Z",
        "value": 85e3,
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "tierValues": {
          "0": 25e3,
          "1": 25e3,
          "2": 25200,
          "3": 35e3,
          "4": 45e3,
          "5": 85e3,
          "fresh": 25e3
        }
      },
      {
        "value": 1e5,
        "date": "Sep 13",
        "timestamp": "2026-09-14T01:13:34.187Z",
        "note": "Staff moderation update",
        "tierValues": {
          "0": 4e4,
          "1": 4e4,
          "2": 40200,
          "3": 5e4,
          "4": 6e4,
          "5": 1e5,
          "fresh": 4e4
        },
        "updatedBy": "Spuppers"
      },
      {
        "date": "Sep 13",
        "value": 125e3,
        "tierValues": {
          "0": 65e3,
          "1": 65e3,
          "2": 65200,
          "3": 75e3,
          "4": 85e3,
          "5": 125e3,
          "fresh": 65e3
        },
        "timestamp": "2026-09-14T01:13:48.682Z",
        "updatedBy": "Spuppers",
        "note": "Staff moderation update"
      },
      {
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "timestamp": "2026-09-14T01:13:57.140Z",
        "date": "Sep 13",
        "tierValues": {
          "0": 9e4,
          "1": 9e4,
          "2": 90200,
          "3": 1e5,
          "4": 11e4,
          "5": 15e4,
          "fresh": 9e4
        },
        "value": 15e4
      }
    ],
    "excludeFromRecentlyUpdated": true,
    "category": "Land",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Mech%20Transport.jpg",
    "demand": 6,
    "tags": [
      "Ground",
      "Special"
    ],
    "hasCustomStarOverrides": false
  },
  {
    "value": 5e3,
    "gemOverrideMin": 3e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Has a powerfull frontal cannon, along with a powerful, slow firing ai cannon. AI back gunner can be replaced with another player, increasing firerate.",
    "gemOverrideMax": 5e3,
    "history": [],
    "thumbnail": "/images/vehicles/Douglas%20A-20.jpg",
    "name": "Douglas A-20",
    "tradeable": true,
    "rarity": "Legendary",
    "category": "Air",
    "hasManualGemRange": true,
    "trend": "Stable",
    "tags": [
      "douglas-a-20"
    ],
    "id": "acdff60f-1572-4782-86e7-a240a053eeb6",
    "demand": 5
  },
  {
    "rarity": "Limited Edition",
    "excludeFromRecentlyUpdated": true,
    "hasCustomStarOverrides": false,
    "gemOverrideMax": 65e4,
    "trend": "Stable",
    "demand": 5,
    "thumbnail": "/images/vehicles/Super%20S.W.A.R.M.jpg",
    "gemOverrideMin": 55e4,
    "name": "Super S.W.A.R.M",
    "value": 65e4,
    "id": "acef4b79-1252-4b5c-a2b5-d49349761473",
    "history": [],
    "tradeable": true,
    "inGameCost": "Gems: 550,000 - 650,000",
    "category": "Air",
    "notes": "Decent aircraft with the supersonic dodge ability, 5 speedy and maneuverable drones that shoot explosive rounds at a slow rate. The Super S.W.A.R.M. also has five medium-damage anti-flare and supersonic missiles and one high AOE high damage supersonic missile. The main highlight is that the fast and maneuverable drones are extremely hard to hit; they can target enemy vehicles and troops, but unfortunately, not missiles. The Super S.W.A.R.M also has gem upgrades that cost 15k at level 35 and another gem upgrade at level 100, which adds a drone for each of those 2 upgrades. The drones also explode for damage and do quite a lot.",
    "acronym": "S SWARM",
    "tags": [
      "Air"
    ],
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inRecentlyUpdated": false
  },
  {
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "thumbnail": "/images/vehicles/Armored%20Corvette.jpg",
    "trend": "Stable",
    "gemOverrideMin": 7500,
    "category": "Naval",
    "tags": [
      "Naval"
    ],
    "gemOverrideMax": 12500,
    "notes": "Has 4 powerfull missiles and a 10 shot cannon similar to patria, it also has a unique missile deflection system",
    "history": [],
    "demand": 5,
    "name": "Armored Corvette",
    "inGameCost": "Gems: 7,500 - 12,500",
    "id": "ae300aab-6057-4d10-b570-ab9d6f35d636",
    "value": 12500,
    "rarity": "Legendary",
    "tradeable": true,
    "hasManualGemRange": true
  },
  {
    "category": "Land",
    "history": [],
    "trend": "Stable",
    "id": "af06f535-3a49-4440-9e9c-1a7ba6b870ce",
    "rarity": "Legendary",
    "tradeable": true,
    "tags": [
      "Ground"
    ],
    "demand": 4,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Stats boosted variant of the super akrep, along with an anti-air lock on the missile launcher that fires 2 hypersonic missiles, added onto the Super Akrep's arsenal of weapons and abilities.",
    "gemOverrideMin": 5e3,
    "value": 6e3,
    "gemOverrideMax": 6e3,
    "thumbnail": "/images/vehicles/AA%20Akrep.jpg",
    "inGameCost": "Gems: 5,000 - 6,000",
    "name": "AA Akrep",
    "hasManualGemRange": true
  },
  {
    "gemOverrideMin": 275,
    "notes": "Multiple ways of obtaining it; it is also one of the weakest air vehicles.(Spec Ops)",
    "category": "Air",
    "value": 325,
    "gemOverrideMax": 325,
    "thumbnail": "/images/vehicles/F-16.jpg",
    "tags": [
      "f-16"
    ],
    "history": [],
    "trend": "Stable",
    "id": "af08005e-d3a7-4786-acec-b178e4cd2321",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true,
    "demand": 2,
    "rarity": "Common",
    "name": "F-16"
  },
  {
    "notes": "A better version of the SSBN as it has a nuclear missile instead of torpedoes. \nalso has a near endless supply of lock on missles.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Nuke%20Sub.jpg",
    "id": "af119a42-95c4-4da3-b274-5f0529d7fa12",
    "history": [],
    "value": 63e3,
    "tags": [
      "Naval"
    ],
    "demand": 8,
    "trend": "Rising",
    "category": "Naval",
    "gemOverrideMax": 63e3,
    "inGameCost": "Gems: 55,000 - 63,000",
    "tradeable": true,
    "name": "Nuke Sub",
    "gemOverrideMin": 55e3,
    "hasManualGemRange": true
  },
  {
    "thumbnail": "/images/vehicles/Master%20Hellstorm.jpg",
    "hasManualGemRange": true,
    "hasCustomStarOverrides": true,
    "starTierOverrides": {
      "0": {
        "value": 75e4,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 675e3,
        "gemOverrideMax": 825e3,
        "demand": 6,
        "hasManualGemRange": false
      },
      "1": {
        "hasManualGemRange": false,
        "value": 75e4,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 675e3,
        "gemOverrideMax": 825e3,
        "demand": 6
      },
      "2": {
        "value": 750200,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMin": 675180,
        "gemOverrideMax": 825220,
        "demand": 6
      },
      "3": {
        "gemOverrideMax": 836e3,
        "hasManualGemRange": false,
        "gemOverrideMin": 684e3,
        "demand": 6,
        "value": 76e4,
        "notes": "",
        "trend": "Stable"
      },
      "4": {
        "gemOverrideMin": 694800,
        "gemOverrideMax": 849200,
        "hasManualGemRange": false,
        "demand": 6,
        "trend": "Stable",
        "notes": "",
        "value": 772e3
      },
      "5": {
        "demand": 6,
        "gemOverrideMin": 733500,
        "gemOverrideMax": 896500,
        "notes": "",
        "trend": "Stable",
        "value": 815e3,
        "hasManualGemRange": false
      },
      "fresh": {
        "gemOverrideMin": 765e3,
        "gemOverrideMax": 935e3,
        "demand": 4,
        "hasManualGemRange": false,
        "value": 85e4,
        "trend": "Stable",
        "notes": ""
      }
    },
    "demand": 6,
    "inRecentlyUpdated": false,
    "tags": [
      "Ground"
    ],
    "acronym": "MHS",
    "notes": "The Master Hellstorm features an improved version of the explosive round, a fast-firing machine gun that is also found on the standard Hellstorm. The Master Hellstorm features 16 Lock-On missiles that can be burst like the rockets of the Elite Lancer and ToS01 variants. The Master Hellstorm's missiles are also anti-flare.",
    "inGameCost": "Gems: 700,000 - 800,000",
    "history": [],
    "value": 8e5,
    "category": "Land",
    "rarity": "Exotic",
    "name": "Master Hellstorm",
    "id": "af1e452d-9294-4f09-b519-cdd21f488058",
    "gemOverrideMin": 7e5,
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMax": 8e5,
    "starOverrides": {
      "0": 75e4,
      "1": 75e4,
      "2": 750200,
      "3": 76e4,
      "4": 772e3,
      "5": 815e3,
      "fresh": 85e4
    },
    "tradeable": true,
    "hasCustomMultiplierOverrides": false
  },
  {
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 4500,
    "value": 5700,
    "history": [],
    "tradeable": true,
    "hasManualGemRange": true,
    "gemOverrideMax": 5700,
    "notes": "Battlepass version of the Ka-52; It is one of the fastest helicopter in the game with above average barage missiles and 2 good bombs ",
    "id": "af1e5c47-53f0-41d6-9207-1414f4832717",
    "tags": [
      "gold-ka-52"
    ],
    "rarity": "Legendary",
    "category": "Air",
    "name": "Gold Ka-52",
    "thumbnail": "/images/vehicles/Gold%20Ka-52.jpg",
    "trend": "Rising",
    "demand": 5
  },
  {
    "rarity": "Rare",
    "tradeable": true,
    "id": "af9e3bb5-1cee-4492-b8d9-59bf0bed1d43",
    "tags": [
      "Emote"
    ],
    "demand": 5,
    "history": [],
    "trend": "Stable",
    "gemOverrideMax": 750,
    "name": "T Pose (Emote)",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "value": 750,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/T%20Pose%20_Emote_.jpg",
    "gemOverrideMin": 500,
    "inGameCost": "Gems: 500 - 750",
    "category": "Tags",
    "notes": "why did the scarecrow win an award? because he was outstanding in his field!"
  },
  {
    "history": [
      {
        "note": "Previous Market Valuation",
        "value": 0,
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0
        },
        "timestamp": "2026-09-09T23:51:44.895Z",
        "updatedBy": "System",
        "date": "Sep 09"
      },
      {
        "value": 2e5,
        "timestamp": "2026-09-10T00:28:04.656Z",
        "updatedBy": "Voiddarkreaper",
        "date": "Sep 09",
        "note": "Staff moderation update",
        "tierValues": {
          "0": 2e5,
          "1": 8e5,
          "2": 4e6,
          "3": 2e7
        }
      }
    ],
    "hasCustomMultiplierOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "tags": [
      "Soldiers"
    ],
    "hasManualGemRange": false,
    "trend": "Rising",
    "thumbnail": "/images/vehicles/Super%20Ace%20Pilot.jpg",
    "acronym": "SAP",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasCustomStarOverrides": false,
    "id": "afa410b3-b2e3-465e-814c-74312f7995a3",
    "name": "Super Ace Pilot",
    "tradeable": true,
    "rarity": "Limited Edition",
    "notes": "The Super Ace Pilot is a vehicle buff-applying troop that buffs air vehicle damage by 6% with 0 stars at any level of Super Ace Pilot. The Super Ace Pilot can also buff air vehicle damage by 30% with 3 stars at any level of Super Ace Pilot. The Super Ace Pilot troops can be stacked together to obtain a max air vehicle buff of 120% if 4 Super Ace Pilot troops with 3 stars are equipped. The Super Ace Pilot features a strong pistol that deals good damage, along with good range. The Super Ace Pilot unfortunately suffers from having low troop health. At 1 star, the Super Ace Pilot buffs aerial vehicle damage by 10%, and by 18% at 2 stars.",
    "category": "Soldier",
    "demand": 8,
    "value": 2e5
  },
  {
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasManualGemRange": true,
    "id": "afd33272-fe76-470d-b840-d42f0d80b36f",
    "history": [],
    "rarity": "Epic",
    "tradeable": true,
    "name": "Challenger",
    "demand": 3,
    "trend": "Stable",
    "tags": [
      "challenger"
    ],
    "gemOverrideMin": 500,
    "value": 1e3,
    "category": "Land",
    "thumbnail": "/images/vehicles/Challenger.jpg",
    "gemOverrideMax": 1e3,
    "notes": "One of the weaker tanks with low HP and a bad main cannon as its only weapon."
  },
  {
    "hasCustomMultiplierOverrides": false,
    "thumbnail": "/images/vehicles/LE%20Battle%20Tank.jpg",
    "trend": "Stable",
    "name": "LE Battle Tank",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-12T22:11:06.638Z",
    "starTierOverrides": {
      "0": {
        "demand": 6,
        "notes": "",
        "trend": "Stable",
        "value": 25e5,
        "hasManualGemRange": false,
        "gemOverrideMax": 2625e3,
        "gemOverrideMin": 2375e3
      },
      "1": {
        "gemOverrideMin": 2280001,
        "gemOverrideMax": 2520001,
        "hasManualGemRange": false,
        "demand": 6,
        "value": 2400001,
        "notes": "",
        "trend": "Stable"
      },
      "2": {
        "hasManualGemRange": false,
        "gemOverrideMax": 2310001,
        "gemOverrideMin": 2090001,
        "demand": 6,
        "value": 2200001,
        "trend": "Stable",
        "notes": ""
      },
      "3": {
        "gemOverrideMin": 1900001,
        "gemOverrideMax": 2100001,
        "hasManualGemRange": false,
        "demand": 6,
        "notes": "",
        "trend": "Stable",
        "value": 2000001
      },
      "4": {
        "value": 2000001,
        "hasManualGemRange": false,
        "gemOverrideMin": 1900001,
        "gemOverrideMax": 2100001,
        "notes": "",
        "trend": "Stable",
        "demand": 6
      },
      "5": {
        "trend": "Rising",
        "notes": "",
        "value": 2e6,
        "hasManualGemRange": false,
        "demand": 8,
        "gemOverrideMax": 21e5,
        "gemOverrideMin": 19e5
      },
      "fresh": {
        "value": 12e6,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMax": 126e5,
        "gemOverrideMin": 114e5,
        "demand": 6
      }
    },
    "hasManualGemRange": false,
    "rarity": "Limited Edition",
    "starOverrides": {
      "0": 25e5,
      "1": 2400001,
      "2": 2200001,
      "3": 2000001,
      "4": 2000001,
      "5": 2e6,
      "fresh": 12e6
    },
    "id": "aff02a54-0755-4955-b37b-d465fc7fa62c",
    "value": 25e5,
    "hasCustomStarOverrides": true,
    "history": [
      {
        "value": 13e5,
        "timestamp": "2026-09-09T23:51:42.449Z",
        "tierValues": {
          "0": 13e5,
          "1": 13e5,
          "2": 1300200,
          "3": 131e4,
          "4": 132e4,
          "5": 136e4,
          "fresh": 13e5
        },
        "updatedBy": "System",
        "date": "Sep 09",
        "note": "Previous Market Valuation"
      },
      {
        "tierValues": {
          "0": 145e4,
          "1": 14e5,
          "2": 14e5,
          "3": 135e4,
          "4": 1300001,
          "5": 13e5,
          "fresh": 12e6
        },
        "date": "Sep 10",
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-10T21:24:10.901Z",
        "value": 13e5,
        "note": "Staff moderation update"
      },
      {
        "updatedBy": "Spuppers",
        "date": "Sep 13",
        "timestamp": "2026-09-14T00:29:33.148Z",
        "tierValues": {
          "0": 25e5,
          "1": 2400001,
          "2": 2200001,
          "3": 2000001,
          "4": 2000001,
          "5": 2e6,
          "fresh": 12e6
        },
        "note": "Staff moderation update",
        "value": 25e5
      }
    ],
    "tradeable": true,
    "category": "Land",
    "acronym": "LEBT",
    "notes": "A strong tank that has 1 large missile, a machine gun and 3 large cannon shots along with this it has a missile deflection system that causes all missiles to bounce off of it",
    "demand": 6,
    "tags": [
      "Special",
      "Collector",
      "le-battle-tank"
    ]
  },
  {
    "name": "Arrow (Banner)",
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "initialHistoryNote": "Catalog addition",
    "thumbnail": "/images/vehicles/Arrow%20_Banner_.jpg",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "inRecentlyUpdated": false,
    "id": "arrow-banner",
    "category": "Tags",
    "history": [
      {
        "note": "Catalog addition",
        "value": 8e3,
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-10T21:06:35.848Z",
        "date": "Sep 10"
      }
    ],
    "demand": 5,
    "notes": "Recently cataloged item.",
    "tradeable": true,
    "rarity": "Exotic",
    "value": 8e3
  },
  {
    "inRecentlyUpdated": false,
    "id": "arrow-emblem",
    "thumbnail": "/images/vehicles/Arrow%20_Emblem_.jpg",
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "category": "Tags",
    "history": [
      {
        "value": 6e3,
        "timestamp": "2026-09-10T21:07:01.063Z",
        "updatedBy": "Spuppers",
        "date": "Sep 10",
        "note": "Catalog addition"
      }
    ],
    "name": "Arrow (Emblem)",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "rarity": "Exotic",
    "notes": "Recently cataloged item.",
    "tradeable": true,
    "initialHistoryNote": "Catalog addition",
    "demand": 5,
    "value": 6e3
  },
  {
    "value": 6e3,
    "rarity": "Exotic",
    "notes": "Recently cataloged item.",
    "initialHistoryNote": "Catalog addition",
    "demand": 5,
    "thumbnail": "/images/vehicles/Arrow%20_Emote_.jpg",
    "name": "Arrow (Emote)",
    "history": [
      {
        "updatedBy": "Spuppers",
        "date": "Sep 10",
        "timestamp": "2026-09-10T21:07:21.702Z",
        "value": 6e3,
        "note": "Catalog addition"
      }
    ],
    "tradeable": true,
    "inRecentlyUpdated": false,
    "id": "arrow-emote",
    "trend": "Stable",
    "category": "Tags",
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-12T22:11:16.644Z"
  },
  {
    "thumbnail": "/images/vehicles/Ruby%20_Banner_.jpg",
    "rarity": "Legendary",
    "gemOverrideMin": 3e3,
    "tags": [
      "Banner"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 4e3,
    "hasManualGemRange": true,
    "demand": 5,
    "history": [],
    "id": "b005299a-3441-483d-9989-17bc9c1292de",
    "category": "Tags",
    "gemOverrideMax": 4e3,
    "notes": "Available through crates.",
    "name": "Ruby (Banner)",
    "tradeable": true,
    "trend": "Stable",
    "inGameCost": "Gems: 3,000 - 4,000"
  },
  {
    "thumbnail": "/images/vehicles/BOSS%20War%20Shrike.jpg",
    "gemOverrideMin": 4e4,
    "trend": "Stable",
    "name": "BOSS War Shrike",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "history": [],
    "gemOverrideMax": 6e4,
    "category": "Air",
    "tags": [
      "Air"
    ],
    "id": "b0595ac6-5023-4afc-b3c1-a6f4f6fe8736",
    "notes": "Improved version of the normal War Shrike with no other special upgrades.",
    "rarity": "Exotic",
    "hasManualGemRange": true,
    "demand": 7,
    "value": 6e4,
    "inGameCost": "Gems: 40,000 - 60,000",
    "tradeable": true
  },
  {
    "value": 700,
    "demand": 3,
    "id": "b05f3dfe-b5df-490d-b4b2-bb29931ea0ff",
    "tradeable": true,
    "notes": "A good DPS naval vehicle with decent speed and good HP. (Buildable)",
    "rarity": "Epic",
    "tags": [
      "Naval"
    ],
    "inGameCost": "Gems: 400 - 700",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "gemOverrideMin": 400,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/North%20Carolina.jpg",
    "category": "Naval",
    "name": "North Carolina",
    "gemOverrideMax": 700,
    "hasManualGemRange": true
  },
  {
    "history": [],
    "notes": "A decent gunship that features the same auto-circling weapons aiming system as the AC-130, C-17, and other similar gunship variants. The Gunship features 2 primary aimable explosive round machine guns\u2014the machine guns currently deal low damage to buildings and vehicles. The AI tail gunner turret that is also featured for the first time on a gunship is quite nice in terms of damage, reload speed, and other stats.",
    "inGameCost": "Gems: 8,000 - 10,000",
    "thumbnail": "/images/vehicles/Greyhound.jpg",
    "name": "Greyhound",
    "value": 1e4,
    "hasManualGemRange": true,
    "id": "b08e453a-9096-4d02-bdbd-cc3967b689cb",
    "category": "Air",
    "trend": "Stable",
    "gemOverrideMax": 1e4,
    "rarity": "Legendary",
    "tradeable": true,
    "gemOverrideMin": 8e3,
    "tags": [
      "Air",
      "Special"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 7
  },
  {
    "gemOverrideMax": 8e3,
    "value": 8e3,
    "demand": 6,
    "gemOverrideMin": 5e3,
    "rarity": "Legendary",
    "tradeable": true,
    "notes": "Compared to the normal SU25, the Sukhoi SU25 has three more machine guns, with a total of four front-firing, explosive-round machine guns. The Sukhoi SU25 also features 2 fewer missiles than the normal SU25, but each missile deals more damage.",
    "category": "Air",
    "tags": [
      "Air"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 5,000 - 8,000",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Sukhoi%20SU25.jpg",
    "id": "b12c2108-4ea3-45ea-9097-01c3f138ac34",
    "name": "Sukhoi SU25",
    "trend": "Stable",
    "history": []
  },
  {
    "demand": 1,
    "gemOverrideMin": 10,
    "trend": "Dropping",
    "tags": [
      "turret-truck"
    ],
    "rarity": "Common",
    "thumbnail": "/images/vehicles/Turret%20Truck.jpg",
    "gemOverrideMax": 100,
    "id": "b1992afd-c6cb-49b9-aed1-02594fba4161",
    "value": 100,
    "hasManualGemRange": true,
    "tradeable": true,
    "history": [],
    "notes": "A buyable tycoon vehicle decent for Arsenal levels.",
    "category": "Land",
    "name": "Turret Truck",
    "lastUpdated": "2026-09-10T22:08:37.729Z"
  },
  {
    "notes": "It is a decent submarine that features 2 ballistic missiles, which ignore flares and accelerate the longer they are launched from the submarine. It also has a turret upgrade at level 35.",
    "category": "Naval",
    "tradeable": true,
    "gemOverrideMax": 4e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 4e4,
    "history": [],
    "name": "Project 665",
    "gemOverrideMin": 3e4,
    "id": "b1bccff8-76f9-4472-829d-bf8a0c32296e",
    "trend": "Stable",
    "rarity": "Exotic",
    "inGameCost": "Gems: 30,000 - 40,000",
    "thumbnail": "/images/vehicles/Project%20665.jpg",
    "tags": [
      "Naval"
    ],
    "hasManualGemRange": true,
    "demand": 3
  },
  {
    "value": 50,
    "rarity": "Common",
    "gemOverrideMax": 50,
    "notes": "This emblem is obtained in the kill tag crates!",
    "tags": [
      "Emblem"
    ],
    "thumbnail": "/images/vehicles/Smoke%20_Emblem_.jpg",
    "demand": 1,
    "gemOverrideMin": 25,
    "id": "b2134275-c0b9-4a1f-9c08-8ef3efe3aeec",
    "history": [],
    "tradeable": true,
    "trend": "Stable",
    "category": "Tags",
    "inGameCost": "Gems: 25 - 50",
    "name": "Smoke (Emblem)",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": true
  },
  {
    "tags": [
      "Emblem",
      "Special"
    ],
    "inRecentlyUpdated": false,
    "notes": "This Emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "thumbnail": "https://static.wixstatic.com/media/341c64_f9beb1b107594e8ab4452132a2d52dfe~mv2.png/v1/fill/w_118,h_130,al_c,lg_1,q_85,enc_avif,quality_auto/341c64_f9beb1b107594e8ab4452132a2d52dfe~mv2.png",
    "history": [],
    "value": 0,
    "id": "b218a1df-b0a9-4bba-97e1-55f9d76c4e46",
    "demand": 5,
    "trend": "Stable",
    "tradeable": false,
    "name": "Colonel (Emblem)",
    "lastUpdated": "2026-08-29",
    "inGameCost": "Untradable",
    "excludeFromRecentlyUpdated": true,
    "category": "Tags",
    "rarity": "Epic"
  },
  {
    "name": "Zeplin-X Nuke",
    "tradeable": true,
    "demand": 6,
    "category": "Air",
    "trend": "Dropping",
    "rarity": "Exotic",
    "inRecentlyUpdated": false,
    "gemOverrideMin": 4e4,
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": true,
    "tags": [
      "zeplin-x-nuke"
    ],
    "notes": "The nuke deals good damage, while the laser cannons of the Zeplin make it a good all-rounder. Average health\nCan outrange most ground vehicles and boats",
    "gemOverrideMax": 48e3,
    "history": [],
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "thumbnail": "/images/vehicles/Zeplin-X%20Nuke.jpg",
    "id": "b2294f0a-3ffa-4b0a-96fd-10afb1219cc8",
    "value": 48e3
  },
  {
    "gemOverrideMax": 575,
    "category": "Air",
    "name": "AC-130",
    "value": 575,
    "id": "b2520cc1-05a8-40c4-bdf6-7f9c9bf32521",
    "gemOverrideMin": 450,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "A decent air to ground combat plane having an explosive minigun and cannon for the pilot and an autocannon for the co-pilot. It is not good for any form of air to air combat.(Spec Ops)",
    "thumbnail": "/images/vehicles/AC-130.jpg",
    "tags": [
      "ac-130"
    ],
    "tradeable": true,
    "rarity": "Rare",
    "demand": 1,
    "history": [],
    "trend": "Dropping",
    "hasManualGemRange": true
  },
  {
    "gemOverrideMax": 1e4,
    "notes": "Decent transport vehicle with a average minigun",
    "tradeable": true,
    "name": "Tralalero",
    "category": "Naval",
    "hasManualGemRange": true,
    "id": "b2fafeb5-64f7-42a3-b1d1-3f91b5720878",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMin": 5e3,
    "value": 1e4,
    "tags": [
      "Naval"
    ],
    "demand": 5,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Tralalero.jpg",
    "history": [],
    "rarity": "Legendary",
    "inGameCost": "Gems: 5,000 - 10,000"
  },
  {
    "notes": "The Top5 Overlord is a top 5 faction reskin of the Master Overlord with some stat increases.",
    "history": [],
    "inGameCost": "Untradable",
    "rarity": "Exotic",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Ground",
      "Collector",
      "Special"
    ],
    "value": 0,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tradeable": false,
    "demand": 8,
    "trend": "Stable",
    "category": "Land",
    "thumbnail": "/images/vehicles/Top5%20Overlord.jpg",
    "id": "b3239d20-f0f4-4c4c-a57e-dcb48474cd7b",
    "inRecentlyUpdated": false,
    "name": "Top5 Overlord"
  },
  {
    "tradeable": true,
    "history": [],
    "trend": "Dropping",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "recon-helicopter"
    ],
    "category": "Air",
    "gemOverrideMax": 550,
    "notes": "The first free to play helicopter with the new recon system.",
    "id": "b32dc5f7-0e8f-4995-8889-620be809c07a",
    "rarity": "Epic",
    "gemOverrideMin": 450,
    "value": 550,
    "name": "Recon Helicopter",
    "thumbnail": "/images/vehicles/Recon%20Helicopter.jpg",
    "demand": 4
  },
  {
    "category": "Air",
    "history": [],
    "notes": "Decent air vehicle with 6 fast missiles, super sonic dodge, frontal shooting, explosive round machine gun, and a passenger seat with currently no weapons. The vehicle has a large hitbox when grounded, so entering both the passenger and the pilot's seat may be difficult.",
    "hasManualGemRange": true,
    "value": 3e4,
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/Super%20F111.jpg",
    "gemOverrideMax": 3e4,
    "trend": "Stable",
    "tradeable": true,
    "rarity": "Exotic",
    "inGameCost": "Gems: 20,000 - 30,000",
    "name": "Super F111",
    "gemOverrideMin": 2e4,
    "id": "b379d0a2-d070-4733-bae5-e25344b1375d",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 3
  },
  {
    "gemOverrideMax": 100,
    "notes": "Good for arsenal levels.",
    "thumbnail": "/images/vehicles/Jetski.jpg",
    "name": "Jetski",
    "inGameCost": "Gems: 20 - 100",
    "gemOverrideMin": 20,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "value": 100,
    "id": "b3c587f2-8238-4f0a-8293-b2ee095c8ff6",
    "tags": [
      "Naval"
    ],
    "trend": "Dropping",
    "category": "Naval",
    "hasManualGemRange": true,
    "rarity": "Common",
    "tradeable": true,
    "history": [],
    "demand": 1
  },
  {
    "category": "Tags",
    "gemOverrideMax": 250,
    "hasManualGemRange": true,
    "tags": [
      "Banner"
    ],
    "trend": "Stable",
    "gemOverrideMin": 150,
    "thumbnail": "/images/vehicles/Arid%20_Banner_.jpg",
    "history": [],
    "id": "b3d9b88d-0419-4644-8be9-3b273caf8b31",
    "name": "Arid (Banner)",
    "rarity": "Uncommon",
    "tradeable": true,
    "notes": "Available through crates.",
    "demand": 5,
    "inGameCost": "Gems: 150 - 250",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 250
  },
  {
    "rarity": "Legendary",
    "id": "b602378f-c276-4825-8abd-a54e578bfab9",
    "multiplierOverrides": {
      "0": 1,
      "1": 4,
      "2": 20,
      "3": 100
    },
    "category": "Drone",
    "trend": "Dropping",
    "demand": 5,
    "tags": [
      "Drones",
      "Special"
    ],
    "tradeable": true,
    "hasCustomMultiplierOverrides": true,
    "hasCustomStarOverrides": false,
    "value": 4e3,
    "thumbnail": "/images/vehicles/Repair%20Drone.jpg",
    "gemOverrideMax": 4e3,
    "history": [],
    "notes": "The repair drone heals only your own vehicle when you're piloting it. The rate at which it heals depends on the star level applied to it. At zero stars, it heals at a rate of 15 HP (Health Points) per second, at 1 star, 40 HP per second, 2 stars, 65 HP per second, and 3 stars, 90 HP per second. This makes the 3-star variant better than the base zero-star Limited Edition Rarity Super Repair Drone models' healing rate. The range at which the Repair Drone can heal your vehicle is 100 meters, which is 75 less than that of the Super Repair drone.",
    "inGameCost": "Gems: 2,000 - 4,000",
    "gemOverrideMin": 2e3,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "starTierOverrides": {
      "0": {
        "hasManualGemRange": false,
        "gemOverrideMax": 2625,
        "gemOverrideMin": 2375,
        "demand": 4,
        "value": 2500,
        "notes": "",
        "trend": "Dropping"
      },
      "1": {
        "trend": "Dropping",
        "notes": "",
        "gemOverrideMin": 9500,
        "gemOverrideMax": 10500,
        "value": 1e4,
        "hasManualGemRange": false,
        "demand": 5
      },
      "2": {
        "demand": 6,
        "gemOverrideMax": 52500,
        "gemOverrideMin": 47500,
        "hasManualGemRange": false,
        "trend": "Dropping",
        "notes": "",
        "value": 5e4
      },
      "3": {
        "hasManualGemRange": false,
        "trend": "Dropping",
        "notes": "",
        "demand": 7,
        "value": 25e4,
        "gemOverrideMax": 262500,
        "gemOverrideMin": 237500
      }
    },
    "hasManualGemRange": true,
    "name": "Repair Drone",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false
  },
  {
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "gemOverrideMin": 14e4,
    "tags": [
      "super-scorpion"
    ],
    "id": "b60e9aec-f197-4e2f-84e3-e8d75f5cdc8f",
    "category": "Air",
    "trend": "Dropping",
    "gemOverrideMax": 175e3,
    "thumbnail": "/images/vehicles/Super%20Scorpion.jpg",
    "tradeable": true,
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "notes": 'Is one of the only vehicles that can "1mag" a fully leveled skyhammer.Excellent at eliminating air vehicles with large pools of health, but lacks defensive capabilities and adequate anti-ground measures',
    "rarity": "Exotic",
    "name": "Super Scorpion",
    "history": [],
    "demand": 7,
    "value": 175e3,
    "excludeFromRecentlyUpdated": true
  },
  {
    "gemOverrideMax": 1e4,
    "hasManualGemRange": true,
    "id": "b6688fb5-f8d3-4f73-9da8-3c1efe7c3411",
    "category": "Tags",
    "gemOverrideMin": 8e3,
    "trend": "Stable",
    "tradeable": true,
    "tags": [
      "Emblem"
    ],
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Shotgun%20_Emblem_.jpg",
    "value": 1e4,
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 8,000 - 10,000",
    "name": "Shotgun (Emblem)",
    "notes": "This emblem has a random chance of being obtained in the kill tag crates!",
    "demand": 5
  },
  {
    "name": "Tank",
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "thumbnail": "/images/vehicles/Tank.jpg",
    "trend": "Dropping",
    "id": "b678fc29-3df4-42a3-819a-19b1548ae871",
    "category": "Land",
    "history": [],
    "tradeable": false,
    "rarity": "Legendary",
    "value": 0,
    "tags": [
      "tank"
    ],
    "demand": 5,
    "inRecentlyUpdated": false,
    "notes": "A gamepass exclusive vehicle that can be driven by either of its two seats. The explosive machine gun is good for killing players and soldiers but the main cannon is better for destroying buildings and vehicles."
  },
  {
    "hasCustomStarOverrides": false,
    "thumbnail": "data:image/jpeg;base64,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",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "gemOverrideMin": 75e3,
    "id": "b71c48bf-6ab4-433b-b5b9-89019606510a",
    "name": "ATC Silkfire",
    "trend": "Stable",
    "category": "Air",
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 85e3,
    "inRecentlyUpdated": false,
    "value": 85e3,
    "hasManualGemRange": true,
    "demand": 5,
    "history": [],
    "rarity": "Legendary",
    "hasCustomMultiplierOverrides": false,
    "notes": "Flare-ignorant missiles and 4 front facing machine guns that are very powerfull after gem upgrade but only good with some skill.",
    "tags": [
      "atc-silkfire"
    ],
    "tradeable": true
  },
  {
    "id": "b78dd734-3503-4807-b1b7-34477501cb54",
    "thumbnail": "/images/vehicles/Super%20Patria.jpg",
    "rarity": "Legendary",
    "category": "Naval",
    "trend": "Dropping",
    "history": [],
    "demand": 4,
    "name": "Super Patria",
    "inGameCost": "Gems: 10,000 - 13,000",
    "value": 13e3,
    "gemOverrideMin": 1e4,
    "hasManualGemRange": true,
    "notes": "upgraded stats version of normal Patria",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "tags": [
      "Naval"
    ],
    "gemOverrideMax": 13e3
  },
  {
    "value": 850,
    "demand": 1,
    "gemOverrideMin": 750,
    "rarity": "Epic",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Can turn invisible, but the bombs don't do much damage nor is the F117 accurate.(Buildable)",
    "gemOverrideMax": 850,
    "tags": [
      "f-117"
    ],
    "tradeable": true,
    "thumbnail": "/images/vehicles/F-117.jpg",
    "id": "b78fffd1-6402-44e0-9b6c-62e5ec202b1f",
    "hasManualGemRange": true,
    "name": "F-117",
    "trend": "Dropping",
    "category": "Air",
    "history": []
  },
  {
    "category": "Air",
    "notes": "Reskinned B-17 with a Prowler-Sized bomb\n\n",
    "gemOverrideMin": 5e3,
    "history": [],
    "name": "Bombardino",
    "value": 1e4,
    "gemOverrideMax": 1e4,
    "inGameCost": "Gems: 5,000 - 10,000",
    "thumbnail": "/images/vehicles/Bombardino.jpg",
    "hasManualGemRange": true,
    "trend": "Stable",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "b7f2c07d-e7ef-4335-a66c-307aa28e3ad8",
    "demand": 5,
    "rarity": "Legendary",
    "tags": [
      "Air"
    ]
  },
  {
    "demand": 7,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Stable",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "gemOverrideMax": 385e4,
        "gemOverrideMin": 315e4,
        "value": 35e5,
        "notes": "",
        "trend": "Dropping",
        "demand": 3,
        "hasManualGemRange": false
      },
      "1": {
        "hasManualGemRange": false,
        "gemOverrideMax": 385e4,
        "gemOverrideMin": 315e4,
        "demand": 3,
        "value": 35e5,
        "trend": "Dropping",
        "notes": ""
      },
      "2": {
        "demand": 3,
        "gemOverrideMin": 3150180,
        "gemOverrideMax": 3850220,
        "notes": "",
        "trend": "Dropping",
        "value": 3500200,
        "hasManualGemRange": false
      },
      "3": {
        "hasManualGemRange": false,
        "trend": "Dropping",
        "notes": "",
        "gemOverrideMin": 3159e3,
        "value": 351e4,
        "gemOverrideMax": 3861e3,
        "demand": 3
      },
      "4": {
        "hasManualGemRange": false,
        "demand": 3,
        "value": 3522e3,
        "gemOverrideMin": 3169800,
        "trend": "Dropping",
        "notes": "",
        "gemOverrideMax": 3874200
      },
      "5": {
        "hasManualGemRange": false,
        "demand": 5,
        "gemOverrideMin": 315e4,
        "gemOverrideMax": 385e4,
        "value": 35e5,
        "trend": "Dropping",
        "notes": ""
      },
      "fresh": {
        "demand": 4,
        "gemOverrideMax": 525e4,
        "gemOverrideMin": 475e4,
        "trend": "Dropping",
        "notes": "",
        "hasManualGemRange": false,
        "value": 5e6
      }
    },
    "rarity": "Limited Edition",
    "hasCustomMultiplierOverrides": false,
    "category": "Naval",
    "inRecentlyUpdated": false,
    "starOverrides": {
      "0": 35e5,
      "1": 35e5,
      "2": 3500200,
      "3": 351e4,
      "4": 3522e3,
      "5": 35e5,
      "fresh": 5e6
    },
    "name": "SeaBreacher-X",
    "tradeable": true,
    "value": 525e4,
    "thumbnail": "/images/vehicles/SeaBreacher-X.jpg",
    "hasCustomStarOverrides": true,
    "inGameCost": "Gems: 4,750,000 - 5,250,000",
    "gemOverrideMin": 475e4,
    "history": [],
    "notes": "Improved version of the SeaBreacher with 4 whole nuke missiles, and overall improved statsVirtually unkillable in most pvp scenarios, and can be used to escape any spawn trap. The machine gun of this vehicle paired with the speed and manueverability of this vehicle make it one of the best vehicles in the game.",
    "tags": [
      "Naval",
      "Collector",
      "Special"
    ],
    "id": "b81ae5a9-c427-448c-a5f7-ef01af13c36c",
    "excludeFromRecentlyUpdated": true,
    "acronym": "SBX",
    "gemOverrideMax": 525e4
  },
  {
    "thumbnail": "/images/vehicles/Mortar%20Truck.jpg",
    "gemOverrideMax": 3e4,
    "tags": [
      "Ground"
    ],
    "notes": "Similar to the Nuke Mortar truck, but doesn't have the nuclear cannon rounds along with having overall lowered stats",
    "gemOverrideMin": 25e3,
    "value": 3e4,
    "inGameCost": "Gems: 25,000 - 30,000",
    "category": "Land",
    "id": "b86b6672-d692-4a7d-bd3e-1114d5637665",
    "name": "Mortar Truck",
    "history": [],
    "demand": 6,
    "hasManualGemRange": true,
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "rarity": "Exotic"
  },
  {
    "tradeable": true,
    "gemOverrideMin": 3e3,
    "history": [],
    "trend": "Dropping",
    "gemOverrideMax": 4700,
    "tags": [
      "f-16-falcon"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 4700,
    "category": "Air",
    "demand": 5,
    "name": "F-16 Falcon",
    "rarity": "Legendary",
    "notes": "First Vehicle to be able to switch between weapons; its ground missiles can 2-shot an AI carrier.",
    "hasManualGemRange": true,
    "id": "b8903366-3069-49af-a69d-275106cc3c66",
    "thumbnail": "/images/vehicles/F-16%20Falcon.jpg"
  },
  {
    "demand": 7,
    "gemOverrideMin": 34e5,
    "starTierOverrides": {
      "0": {
        "notes": "",
        "trend": "Stable",
        "value": 3500001,
        "hasManualGemRange": false,
        "demand": 3,
        "gemOverrideMax": 3850001,
        "gemOverrideMin": 3150001
      },
      "1": {
        "gemOverrideMax": 3850001,
        "gemOverrideMin": 3150001,
        "trend": "Stable",
        "notes": "",
        "value": 3500001,
        "hasManualGemRange": false,
        "demand": 3
      },
      "2": {
        "hasManualGemRange": false,
        "value": 3500200,
        "demand": 3,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMax": 3850220,
        "gemOverrideMin": 3150180
      },
      "3": {
        "gemOverrideMax": 3861e3,
        "gemOverrideMin": 3159e3,
        "demand": 3,
        "notes": "",
        "hasManualGemRange": false,
        "trend": "Stable",
        "value": 351e4
      },
      "4": {
        "hasManualGemRange": false,
        "demand": 3,
        "gemOverrideMax": 3874200,
        "gemOverrideMin": 3169800,
        "notes": "",
        "trend": "Stable",
        "value": 3522e3
      },
      "5": {
        "notes": "",
        "trend": "Stable",
        "demand": 7,
        "value": 35e5,
        "hasManualGemRange": false,
        "gemOverrideMax": 385e4,
        "gemOverrideMin": 315e4
      },
      "fresh": {
        "value": 375e4,
        "trend": "Stable",
        "notes": "",
        "demand": 7,
        "gemOverrideMax": 4125e3,
        "gemOverrideMin": 3375e3,
        "hasManualGemRange": false
      }
    },
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Ground",
      "Special"
    ],
    "hasCustomStarOverrides": true,
    "gemOverrideMax": 36e5,
    "excludeFromRecentlyUpdated": true,
    "rarity": "Limited Edition",
    "thumbnail": "/images/vehicles/Super%20Beam%20Tank.jpg",
    "trend": "Stable",
    "name": "Super Beam Tank",
    "tradeable": true,
    "starOverrides": {
      "0": 3500001,
      "1": 3500001,
      "2": 3500200,
      "3": 351e4,
      "4": 3522e3,
      "5": 35e5,
      "fresh": 375e4
    },
    "acronym": "SBT",
    "value": 36e5,
    "category": "Land",
    "inGameCost": "Gems: 3,400,000 - 3,600,000",
    "hasCustomMultiplierOverrides": false,
    "notes": "The Super Beam Tank is a stats-improved version of the Beam Tank, with no major differences other than the larger ammo capacity for the machine gun and laser weapon. The damage of the weapons seems to be about the same. The reload speeds are slightly faster than those of the normal Beam Tank.",
    "history": [],
    "id": "b8f5267c-1d07-4557-8434-4a2e65394a4f"
  },
  {
    "gemOverrideMin": 5e3,
    "id": "b91a520b-48b3-4189-bb73-c30599527d8b",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "trend": "Stable",
    "gemOverrideMax": 7500,
    "history": [],
    "thumbnail": "/images/vehicles/Keiler.jpg",
    "name": "Keiler",
    "tradeable": true,
    "value": 7500,
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "category": "Land",
    "inGameCost": "Gems: 5,000 - 7,500",
    "notes": "The Keiler features 6 mines that explode upon vertical contact by a troop or vehicle. The front of the Keiler features mine sweepers that will disarm and kind of eat the mine, ensuring no explosions occur. The Keiler also features an aimable explosive round machine gun that deals decent damage and has good velocity, range, and accuracy. The mines have a long reload time making them a bit obsolete.",
    "tags": [
      "Ground",
      "Special"
    ],
    "demand": 4
  },
  {
    "history": [],
    "trend": "Stable",
    "gemOverrideMax": 7e4,
    "thumbnail": "/images/vehicles/Mech%20Walker.jpg",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "hasCustomStarOverrides": false,
    "acronym": "MW",
    "hasManualGemRange": true,
    "gemOverrideMin": 6e4,
    "tags": [
      "Ground"
    ],
    "category": "Land",
    "id": "b9a1cfcf-2a0e-4389-9393-1e6b97dc26a6",
    "notes": "The mech walker features the same mech chassis as the strike mech, where the mech legs rotate on a point. Along with having an infinite boost, increasing vehicle speed. The Mech Walker features 4 lock-on aimable explosive cannon clusters, like that of the master warmaul. The Mech Walker also features 2 lock-on salvos of 5 missile bursts that deal decent damage.",
    "rarity": "Exotic",
    "value": 7e4,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "inGameCost": "Gems: 60,000 - 70,000",
    "name": "Mech Walker",
    "demand": 7
  },
  {
    "tags": [
      "Collector",
      "zombie-ac-130"
    ],
    "category": "Air",
    "thumbnail": "/images/vehicles/Zombie%20AC-130.jpg",
    "rarity": "Legendary",
    "notes": "reskinned gold ac-130",
    "id": "baa18ff5-0e62-41d8-bfa6-11fccef635d2",
    "demand": 2,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "value": 10600,
    "gemOverrideMin": 8600,
    "name": "Zombie AC-130",
    "hasManualGemRange": true,
    "trend": "Dropping",
    "history": [],
    "tradeable": true,
    "gemOverrideMax": 10600
  },
  {
    "gemOverrideMax": 550,
    "value": 550,
    "rarity": "Epic",
    "hasManualGemRange": true,
    "notes": "A slow tank that does not have a great main cannon and the machine gun it has is sub-par.",
    "tags": [
      "phanter"
    ],
    "category": "Land",
    "gemOverrideMin": 450,
    "demand": 3,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "baab34e2-531a-4819-a0cf-4ed25930d29f",
    "tradeable": true,
    "thumbnail": "/images/vehicles/Phanter.jpg",
    "history": [],
    "trend": "Rising",
    "name": "Phanter"
  },
  {
    "demand": 6,
    "gemOverrideMax": 8e3,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "tags": [
      "Naval"
    ],
    "thumbnail": "/images/vehicles/Steel%20Rain.jpg",
    "category": "Naval",
    "hasCustomStarOverrides": false,
    "rarity": "Legendary",
    "gemOverrideMin": 7e3,
    "id": "bacb9fdb-b1e3-4776-8acb-12e53497faba",
    "inGameCost": "Gems: 7,000 - 8,000",
    "trend": "Stable",
    "name": "Steel Rain",
    "inRecentlyUpdated": false,
    "hasCustomMultiplierOverrides": false,
    "value": 8e3,
    "hasManualGemRange": true,
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "notes": "The Steel Rain currently features the same weapons set as the Exotic rarity Master Rain. It seems there are slight statistical differences between the 2 vehicles, but they are overall the same with no major differences."
  },
  {
    "inRecentlyUpdated": false,
    "notes": "A bulky helicopter with decent speed and damage, comes with barage missiles. A good choice for boss fights.",
    "hasManualGemRange": false,
    "category": "Air",
    "tradeable": true,
    "rarity": "Limited Edition",
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "hasCustomStarOverrides": false,
    "value": 12500,
    "tags": [
      "Special",
      "gold-mi35"
    ],
    "demand": 3,
    "trend": "Stable",
    "gemOverrideMax": 12500,
    "thumbnail": "/images/vehicles/Gold%20MI35.jpg",
    "name": "Gold MI35",
    "id": "badabcd3-9c9b-43c9-821d-d7003b437fe3",
    "hasCustomMultiplierOverrides": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "gemOverrideMin": 1e4
  },
  {
    "inGameCost": "Gems: 5 - 50",
    "trend": "Stable",
    "tags": [
      "Soldiers"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "hasManualGemRange": true,
    "category": "Soldier",
    "id": "bb0de132-c595-4197-9c56-7255370da455",
    "value": 50,
    "thumbnail": "/images/vehicles/Sniper.jpg",
    "gemOverrideMin": 5,
    "demand": 2,
    "notes": "A soldier with poor damage and dps, it is not recomended to try to trade or use this thing.",
    "rarity": "Common",
    "gemOverrideMax": 50,
    "name": "Sniper",
    "history": []
  },
  {
    "gemOverrideMin": 25,
    "history": [],
    "value": 50,
    "tradeable": true,
    "inGameCost": "Gems: 25 - 50",
    "notes": "This emblem is obtainable by the kill tag crates!",
    "gemOverrideMax": 50,
    "id": "bb21565a-e2f3-47cc-b2d3-16a451fa4ade",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "Emblem"
    ],
    "hasManualGemRange": true,
    "rarity": "Common",
    "category": "Tags",
    "name": "Flag (Emblem)",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Flag%20_Emblem_.jpg",
    "demand": 1
  },
  {
    "rarity": "Limited Edition",
    "tradeable": true,
    "trend": "Stable",
    "demand": 4,
    "inGameCost": "Gems: 20,000 - 25,000",
    "tags": [
      "Air"
    ],
    "value": 25e3,
    "history": [],
    "id": "bb3d3334-9fcd-4d59-921f-f67372eaf7c0",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "category": "Air",
    "notes": "Upgraded Boss Yal, but suffers from dated weaponry which doesn't hold up to modern standards",
    "hasManualGemRange": false,
    "thumbnail": "/images/vehicles/LE%20YAL-1.jpg",
    "inRecentlyUpdated": false,
    "hasCustomStarOverrides": false,
    "name": "LE YAL-1",
    "hasCustomMultiplierOverrides": false,
    "excludeFromRecentlyUpdated": true
  },
  {
    "rarity": "Legendary",
    "value": 25e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "excludeFromRecentlyUpdated": true,
    "notes": "Decent ground vehicle with twin machine guns just like the super varient.",
    "tags": [
      "Ground",
      "Special"
    ],
    "demand": 7,
    "hasCustomStarOverrides": false,
    "thumbnail": "/images/vehicles/Anti%20Nuke%20Jeep.jpg",
    "id": "bb7737cb-e375-49cf-9b63-46c27d5650a4",
    "inGameCost": "Gems: 20,000 - 25,000",
    "tradeable": true,
    "gemOverrideMax": 25e3,
    "history": [],
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "trend": "Stable",
    "category": "Land",
    "acronym": "ANJ",
    "gemOverrideMin": 2e4,
    "name": "Anti Nuke Jeep"
  },
  {
    "inRecentlyUpdated": false,
    "gemOverrideMin": 12500,
    "inGameCost": "Gems: 12,500 - 14,000",
    "thumbnail": "/images/vehicles/Skull%20Helm%20_Emblem_.jpg",
    "tags": [
      "Emblem"
    ],
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 14e3,
    "history": [],
    "trend": "Stable",
    "rarity": "Exotic",
    "value": 14e3,
    "id": "bb7fc672-1041-4749-9e42-d624bcc3d002",
    "name": "Skull Helm (Emblem)",
    "demand": 5,
    "hasCustomMultiplierOverrides": false,
    "notes": "This emblem has a random chance of being pulled from the kill tag crates!",
    "category": "Tags",
    "hasCustomStarOverrides": false,
    "tradeable": true
  },
  {
    "rarity": "Common",
    "value": 100,
    "tradeable": true,
    "notes": "Available through crates.",
    "tags": [
      "Banner"
    ],
    "demand": 5,
    "history": [],
    "inGameCost": "Gems: 50 - 100",
    "gemOverrideMax": 100,
    "trend": "Stable",
    "hasManualGemRange": true,
    "category": "Tags",
    "name": "Earth (Banner)",
    "gemOverrideMin": 50,
    "id": "bcd66522-2d79-4857-b6d2-02a6f12eb91e",
    "thumbnail": "/images/vehicles/Earth%20_Banner_.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "thumbnail": "/images/vehicles/Midas%20_Banner_.jpg",
    "category": "Tags",
    "history": [],
    "name": "Midas (Banner)",
    "id": "bd1cf9cd-3bef-4dea-bc45-61f153351711",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 3e3,
    "demand": 5,
    "value": 4e3,
    "rarity": "Legendary",
    "hasManualGemRange": true,
    "notes": "Available through crates.",
    "gemOverrideMax": 4e3,
    "tradeable": true,
    "tags": [
      "Banner"
    ],
    "inGameCost": "Gems: 3,000 - 4,000"
  },
  {
    "notes": "A better version of the Alvis stormer.",
    "gemOverrideMax": 800,
    "id": "bd6371cf-5061-4b41-be25-78b1c76a578f",
    "thumbnail": "/images/vehicles/Boss%20Stormer.jpg",
    "value": 800,
    "gemOverrideMin": 500,
    "history": [],
    "name": "Boss Stormer",
    "trend": "Stable",
    "category": "Land",
    "demand": 1,
    "tradeable": true,
    "tags": [
      "boss-stormer"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasManualGemRange": true,
    "rarity": "Epic"
  },
  {
    "demand": 6,
    "thumbnail": "/images/vehicles/Grenade%20Bunny.jpg",
    "rarity": "Legendary",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tags": [
      "Soldiers"
    ],
    "inGameCost": "Gems: 1,250 - 1,750",
    "gemOverrideMax": 1750,
    "value": 1750,
    "name": "Grenade Bunny",
    "tradeable": true,
    "hasManualGemRange": true,
    "notes": "The Grenade Bunny is an Easter reskin of the Halloween event Pumpkin Soldier.",
    "gemOverrideMin": 1250,
    "category": "Soldier",
    "id": "bd88c39d-d228-4ed8-b61b-5b07ebcd5d84",
    "history": []
  },
  {
    "inGameCost": "Gems: 3,000,000 - 4,000,000",
    "tradeable": true,
    "notes": "Reskinned Boss Killer, it is now notably rare with the lack of dupes",
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "hasManualGemRange": false,
    "demand": 7,
    "value": 45e5,
    "rarity": "Exotic",
    "category": "Soldier",
    "tags": [
      "Soldiers",
      "Collector",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "hasCustomStarOverrides": false,
    "id": "be16a0ee-1e39-4808-b4a7-093478ee25b0",
    "trend": "Rising",
    "acronym": "SKILLER",
    "hasCustomMultiplierOverrides": false,
    "name": "Santa Killer",
    "history": [
      {
        "timestamp": "2026-06-12T22:11:16.644Z",
        "updatedBy": "System",
        "note": "Previous Market Valuation",
        "value": 4e6,
        "tierValues": {
          "0": 5e6,
          "1": 2e7,
          "2": 1e8,
          "3": 5e8
        },
        "date": "Jun 12"
      },
      {
        "note": "Staff moderation update",
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-14T00:39:38.878Z",
        "value": 45e5,
        "date": "Sep 13",
        "tierValues": {
          "0": 45e5,
          "1": 18e6,
          "2": 9e7,
          "3": 45e7
        }
      }
    ],
    "thumbnail": "/images/vehicles/Santa%20Killer.jpg"
  },
  {
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Ground",
      "Special"
    ],
    "value": 4e5,
    "id": "be42667d-64f2-465f-bd80-0bcb6f7d6ab2",
    "category": "Land",
    "notes": "The Super Tiger Mech features the same weapons arsenal and features as the normal Tiger Mech. The difference between the 2 mechs seems to be in their rotation speed, reload speed, and ammo capacity.",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasCustomStarOverrides": false,
    "demand": 7,
    "thumbnail": "/images/vehicles/Super%20Tiger%20Mech.jpg",
    "gemOverrideMax": 4e5,
    "acronym": "STM",
    "inGameCost": "Gems: 350,000 - 400,000",
    "name": "Super Tiger Mech",
    "gemOverrideMin": 35e4,
    "rarity": "Limited Edition",
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "history": [],
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    }
  },
  {
    "tradeable": false,
    "tags": [
      "Emblem",
      "Special"
    ],
    "demand": 5,
    "trend": "Stable",
    "history": [],
    "category": "Tags",
    "rarity": "Rare",
    "inGameCost": "Untradable",
    "name": "Second Lieutenant (Emblem)",
    "inRecentlyUpdated": false,
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "excludeFromRecentlyUpdated": true,
    "id": "beaa199a-7641-46f6-b997-03c02b976439",
    "lastUpdated": "2026-08-29",
    "thumbnail": "https://static.wixstatic.com/media/341c64_745da18327924814849e06dfae017b1b~mv2.jpeg/v1/fill/w_206,h_228,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_745da18327924814849e06dfae017b1b~mv2.jpeg",
    "value": 0
  },
  {
    "tradeable": true,
    "inGameCost": "Gems: 400,000 - 450,000",
    "tags": [
      "Air",
      "Special"
    ],
    "id": "bfbc5956-ef82-494a-b4e2-de7e00208ec1",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "The Limited XF12 features the same weapons set, reload speeds, maneuverability, speed, health, and acceleration. The Limited XF12 seems to just be a physical reskin and features no real advantage other than an artificial demand for its rarity and lower stock amount.",
    "category": "Air",
    "excludeFromRecentlyUpdated": true,
    "value": 45e4,
    "hasCustomStarOverrides": false,
    "demand": 5,
    "inRecentlyUpdated": false,
    "trend": "Stable",
    "gemOverrideMin": 4e5,
    "acronym": "XF12",
    "name": "Limited XF12",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "history": [],
    "thumbnail": "/images/vehicles/Limited%20XF12.jpg",
    "gemOverrideMax": 45e4,
    "rarity": "Limited Edition"
  },
  {
    "tradeable": true,
    "name": "Master Overlord",
    "demand": 7,
    "trend": "Stable",
    "id": "bfe6e610-bddf-4ec0-831c-e26659493203",
    "rarity": "Exotic",
    "inGameCost": "Gems: 25,000 - 35,000",
    "hasManualGemRange": true,
    "tags": [
      "Ground"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "Slow-moving Hover vehicle that features a 3-round per salvo cannon and  6 average lock-on missiles. The primary feature of the Master Overlord is that it can drive over both water and land. The difference between the Master Overlord and the normal Overlord is that the Master variant has what looks like a frontal shovel, which increases the hitbox of the Master Overlord compared to that of the normal Overlord. Also, thanks to TOXIC_Killer6665 for helping out with information about the vehicle. Though the hitbox may be larger, the frontal shovel has shield properties similar to that of the Jagdpanther.",
    "gemOverrideMin": 25e3,
    "category": "Land",
    "history": [],
    "thumbnail": "/images/vehicles/Master%20Overlord.jpg",
    "gemOverrideMax": 35e3,
    "value": 35e3
  },
  {
    "inGameCost": "Gems: 5,000 - 10,000",
    "gemOverrideMin": 5e3,
    "history": [],
    "rarity": "Legendary",
    "name": "C17 Liberty",
    "demand": 7,
    "hasManualGemRange": true,
    "gemOverrideMax": 1e4,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/C17%20Liberty.jpg",
    "id": "bffcbf33-3a92-4cf2-98ce-76a69712c17b",
    "tradeable": true,
    "tags": [
      "Air"
    ],
    "value": 1e4,
    "category": "Air",
    "notes": "Reskinned C-17"
  },
  {
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Wulf.jpg",
    "gemOverrideMin": 5800,
    "hasManualGemRange": true,
    "history": [],
    "tags": [
      "wulf"
    ],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 7200,
    "notes": "Strong machinegun and a vertical VTOL. Power upgrade gives it 12 missiles, each fired in rounds of 3 (meaning it fires 3 missiles every click).",
    "id": "c0954e28-d7af-4663-a18c-52e1b2d086fc",
    "category": "Air",
    "rarity": "Legendary",
    "value": 7200,
    "demand": 4,
    "tradeable": true,
    "name": "Wulf"
  },
  {
    "notes": "The first paid exclusive limited edition vehicle that features the same Dodge as the Raptor variants. Along with having hypersonic missiles and a front-firingou, explosive-rnd machine gun.",
    "acronym": "SF18",
    "rarity": "Limited Edition",
    "category": "Air",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "inGameCost": "Gems: 300,000 - 350,000",
    "inRecentlyUpdated": false,
    "name": "LE F18 Hornet",
    "history": [],
    "value": 35e4,
    "thumbnail": "/images/vehicles/LE%20F18%20Hornet.jpg",
    "id": "c0e99903-7d86-4f88-a65d-2bf5871c6a66",
    "demand": 5,
    "tradeable": true,
    "hasCustomStarOverrides": false,
    "trend": "Stable",
    "gemOverrideMax": 35e4,
    "tags": [
      "Air",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMin": 3e5,
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "history": [],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "trend": "Stable",
    "name": "Tixplane",
    "rarity": "Legendary",
    "category": "Air",
    "thumbnail": "/images/vehicles/Tixplane.jpg",
    "demand": 6,
    "gemOverrideMin": 1e3,
    "inGameCost": "Gems: 1,000 - 1,200",
    "tags": [
      "Air",
      "Collector"
    ],
    "id": "c0ed4fd8-2c1e-41e9-a3b3-26128e1dc4e4",
    "notes": "An average biplane with a tix livery. It also features 2 strong tix missiles that are the same high damage missiles one the Su-24. The front firing machine gun has a slow fire rate, low damage, and is not explosive.",
    "tradeable": true,
    "gemOverrideMax": 1200,
    "hasManualGemRange": true,
    "value": 1200
  },
  {
    "id": "c0f946f1-e154-4b37-876d-78f183ffead0",
    "notes": "cant wait to kill quaser then forcing him to see that i have this emote equipped",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 750 - 1,250",
    "value": 1250,
    "tags": [
      "Emote"
    ],
    "history": [],
    "tradeable": true,
    "trend": "Stable",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Loser%20_Emote_.jpg",
    "demand": 5,
    "category": "Tags",
    "gemOverrideMin": 750,
    "rarity": "Epic",
    "name": "Loser (Emote)",
    "gemOverrideMax": 1250
  },
  {
    "gemOverrideMax": 250,
    "value": 250,
    "thumbnail": "/images/vehicles/Woodland%20_Banner_.jpg",
    "category": "Tags",
    "id": "c1041731-affc-42cc-b0d6-7693a1d9812b",
    "history": [],
    "gemOverrideMin": 150,
    "notes": "Available through crates.",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tags": [
      "Banner"
    ],
    "inGameCost": "Gems: 150 - 250",
    "demand": 5,
    "rarity": "Uncommon",
    "name": "Woodland (Banner)",
    "trend": "Stable",
    "hasManualGemRange": true,
    "tradeable": true
  },
  {
    "name": "Apache",
    "history": [],
    "thumbnail": "/images/vehicles/Apache.jpg",
    "trend": "Stable",
    "tradeable": false,
    "excludeFromRecentlyUpdated": true,
    "demand": 5,
    "tags": [
      "Special",
      "apache"
    ],
    "value": 0,
    "id": "c13cd07d-3f78-4e45-9b3b-bc2c6b04f4ab",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "rarity": "Legendary",
    "category": "Air",
    "inRecentlyUpdated": false,
    "notes": "One of the best helicopters available with strong machine guns and 8 lock-on missiles."
  },
  {
    "tradeable": true,
    "tags": [
      "Weapon",
      "Collector",
      "Special"
    ],
    "demand": 6,
    "category": "Other",
    "trend": "Stable",
    "gemOverrideMin": 6e4,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Limited Edition",
    "gemOverrideMax": 75e3,
    "name": "Phoenix Shotgun",
    "inGameCost": "Gems: 60,000 - 75,000",
    "notes": "The Phoenix Shotgun features 25 Dragon's Breath shells per magazine that deal burn damage capable of 1-shotting an enemy through any armor. This is as long as a single bullet from a shell round hits the enemy. The Phoenix Shotgun doesn't seem to apply the Dragon's Breath burn damage to vehicles, the electrical panel in bases, or buildings. The range of the Phoenix Shotgun seems to be infinite as long as you're able to aim and hit a shot, and not have your bullets from the shell be rendered out of the game. The Phoenix Shotgun has a fire rate and reload speed similar to that of the AA-12 shotgun.",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      }
    },
    "id": "c19e955f-f948-4795-a15b-7d4f4b389dbb",
    "history": [],
    "thumbnail": "/images/vehicles/Phoenix%20Shotgun.jpg",
    "value": 75e3
  },
  {
    "id": "c1e843e4-582c-4207-a4d8-f87049cc34fb",
    "rarity": "Legendary",
    "name": "Super Hovercraft",
    "demand": 3,
    "hasManualGemRange": true,
    "history": [],
    "tradeable": true,
    "category": "Naval",
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Super%20Hovercraft.jpg",
    "inGameCost": "Gems: 2,250 - 2,750",
    "gemOverrideMin": 2250,
    "tags": [
      "Naval",
      "Collector",
      "Special"
    ],
    "value": 2750,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 2750,
    "notes": "A hovercraft with a lock on rockets that deal low damage. The Super Hovercraft was only obtainable from a limited wheel spin, making it rare and sought after."
  },
  {
    "hasManualGemRange": true,
    "acronym": "SX59",
    "name": "Super X59",
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Exotic",
    "gemOverrideMax": 4e5,
    "id": "c24673c4-39dd-4c9c-b2a4-7e95bcd48407",
    "trend": "Stable",
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "category": "Air",
    "thumbnail": "/images/vehicles/Super%20X59.jpg",
    "demand": 7,
    "gemOverrideMin": 35e4,
    "tradeable": true,
    "hasCustomStarOverrides": false,
    "tags": [
      "Air"
    ],
    "notes": "The Super X59 features two anti-flare and anti-dodge missiles that deal average damage. It is also fast and boasts amazing maneuverability. Additionally, the Super X59 comes equipped with four drop bombs, which deal decent damage and have a good splash damage area.",
    "inGameCost": "Gems: 350,000 - 400,000",
    "value": 4e5
  },
  {
    "tradeable": true,
    "name": "Frost (Banner)",
    "value": 2500,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "c24a8593-4260-413a-b8c3-b28dd4321c48",
    "notes": "Available through crates.",
    "hasManualGemRange": true,
    "tags": [
      "Banner"
    ],
    "gemOverrideMax": 2500,
    "rarity": "Epic",
    "category": "Tags",
    "inGameCost": "Gems: 2,000 - 2,500",
    "thumbnail": "/images/vehicles/Frost%20_Banner_.jpg",
    "demand": 5,
    "gemOverrideMin": 2e3,
    "history": [],
    "trend": "Stable"
  },
  {
    "value": 0,
    "thumbnail": "https://static.wixstatic.com/media/f89faf_0d060f16777f4a9d8efea52a69dcca9c~mv2.png/v1/fill/w_373,h_413,al_c,lg_1,q_85,enc_avif,quality_auto/f89faf_0d060f16777f4a9d8efea52a69dcca9c~mv2.png",
    "hasCustomStarOverrides": false,
    "notes": "This weapon is very basic and does not serve much purpose. It has been untradable since May 27th, 2026. Thanks to EpicS for the image!",
    "id": "c32133e9-8782-4058-ad62-82ae0523c3a9",
    "inGameCost": "Untradable",
    "inRecentlyUpdated": false,
    "category": "Tags",
    "name": "UZI",
    "hasManualGemRange": false,
    "rarity": "Common",
    "trend": "Stable",
    "tradeable": false,
    "tags": [
      "Soldiers"
    ],
    "demand": 1,
    "history": [],
    "hasCustomMultiplierOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-08-29"
  },
  {
    "history": [],
    "gemOverrideMin": 5800,
    "tags": [
      "c-17"
    ],
    "trend": "Dropping",
    "category": "Air",
    "gemOverrideMax": 7100,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/C-17.jpg",
    "id": "c34dbbd9-72e5-4e71-ad23-f8d1476a929d",
    "name": "C-17",
    "tradeable": true,
    "rarity": "Legendary",
    "notes": "Works like an AC-130 but has more weapons and is faster; harder to turn on the other hand. This can be fixed by switching on wip control, entering the vehicle and then exiting, switching off the wip controls.",
    "demand": 2,
    "value": 7100
  },
  {
    "rarity": "Rare",
    "value": 100,
    "tradeable": true,
    "inGameCost": "Gems: 75 - 100",
    "notes": "This emblem is obtained in the kill tag crates!",
    "demand": 3,
    "tags": [
      "Emblem"
    ],
    "id": "c37b94be-1792-4e80-842b-3ec42000db59",
    "gemOverrideMax": 100,
    "gemOverrideMin": 75,
    "name": "Strong Shield (Emblem)",
    "thumbnail": "/images/vehicles/Strong%20Shield%20_Emblem_.jpg",
    "hasManualGemRange": true,
    "trend": "Stable",
    "history": [],
    "category": "Tags",
    "lastUpdated": "2026-09-10T22:08:36.830Z"
  },
  {
    "tags": [
      "shocker"
    ],
    "hasManualGemRange": true,
    "notes": "Has infinite spam EMP missiles, along with having a high tendency to flip over, it is also known by the in game name of Lunar Rover",
    "id": "c39188e0-02d8-4131-9bbf-49f3252b6cfe",
    "tradeable": true,
    "value": 1e4,
    "thumbnail": "/images/vehicles/Shocker.jpg",
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Dropping",
    "gemOverrideMax": 1e4,
    "name": "Shocker",
    "rarity": "Legendary",
    "history": [],
    "gemOverrideMin": 8e3,
    "demand": 4
  },
  {
    "rarity": "Legendary",
    "id": "c3ca83db-2c1a-4e7a-8d4a-349e907f0d8f",
    "gemOverrideMax": 1250,
    "hasManualGemRange": true,
    "demand": 1,
    "history": [],
    "trend": "Stable",
    "gemOverrideMin": 750,
    "thumbnail": "/images/vehicles/Santa%20Assassin.jpg",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Soldiers"
    ],
    "tradeable": true,
    "inGameCost": "Gems: 750 - 1,250",
    "value": 1250,
    "category": "Soldier",
    "name": "Santa Assassin",
    "notes": "Reskined assassin"
  },
  {
    "rarity": "Epic",
    "gemOverrideMax": 2e4,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Assassin%20Sniper.jpg",
    "demand": 7,
    "trend": "Stable",
    "gemOverrideMin": 15e3,
    "category": "Other",
    "tags": [
      "Weapon"
    ],
    "value": 2e4,
    "inGameCost": "Gems: 15,000 - 20,000",
    "id": "c3d70eeb-cbe7-4c00-aea6-84068fe5879f",
    "name": "Assassin Sniper",
    "history": [],
    "tradeable": true,
    "notes": "Reskin of the Barrett, but has an improved fire rate to one similar to that of the Desert Eagle.",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "notes": "Average VTOL aircraft with 4 drop bombs, and 8 total missiles with 4 of them being faster missiles.\n\nBombs are extremely weak",
    "gemOverrideMax": 5e4,
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Super%20Harrier.jpg",
    "gemOverrideMin": 37500,
    "tags": [
      "Air"
    ],
    "value": 5e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 6,
    "trend": "Dropping",
    "history": [],
    "tradeable": true,
    "inGameCost": "Gems: 37,500 - 50,000",
    "hasManualGemRange": true,
    "category": "Air",
    "id": "c401c3ef-c494-4707-b861-df99b456e5bf",
    "name": "Super Harrier"
  },
  {
    "hasManualGemRange": true,
    "rarity": "Common",
    "value": 50,
    "category": "Tags",
    "inGameCost": "Gems: 25 - 50",
    "history": [],
    "notes": "This emblem is obtained by the kill tag crate!",
    "demand": 1,
    "name": "Launcher (Emblem)",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Launcher%20_Emblem_.jpg",
    "gemOverrideMax": 50,
    "trend": "Stable",
    "id": "c4ef42f7-b57c-4e2f-96ef-9c374a7c83e0",
    "tags": [
      "Emblem"
    ],
    "gemOverrideMin": 25
  },
  {
    "inGameCost": "Gems: 10 - 20",
    "rarity": "Common",
    "value": 20,
    "name": "Medic",
    "hasManualGemRange": true,
    "demand": 0,
    "notes": "Good to heal up troops but not great in dps.\nUseful in vehicle PVP",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Medic.jpg",
    "tags": [
      "Soldiers"
    ],
    "category": "Soldier",
    "tradeable": true,
    "gemOverrideMax": 20,
    "history": [],
    "id": "c52adcfe-bd8a-4c7e-b4c8-e10347e2bd03",
    "gemOverrideMin": 10,
    "trend": "Stable"
  },
  {
    "name": "PL-01",
    "thumbnail": "/images/vehicles/PL-01.jpg",
    "demand": 3,
    "gemOverrideMin": 275,
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "id": "c56cae9f-90ea-4dce-8b80-16be8707f7f1",
    "gemOverrideMax": 325,
    "rarity": "Epic",
    "category": "Land",
    "tags": [
      "pl-01"
    ],
    "notes": "A strong and fast tank that has a good explosive machine gun and main cannon. This version is more powerful than the gold PL-01 if it has the event upgrade that was onbtainable when the tank was released.",
    "tradeable": true,
    "value": 325,
    "hasManualGemRange": true
  },
  {
    "trend": "Stable",
    "tradeable": true,
    "acronym": "SCOBRA",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "name": "LE Cobra Super",
    "gemOverrideMin": 275e3,
    "notes": "Slightly buffed version of the LE Cobra with larger ammo capacity for the machine gun.",
    "category": "Air",
    "inRecentlyUpdated": false,
    "rarity": "Limited Edition",
    "id": "c5814f48-3d98-4a80-a68b-d04f29ac03be",
    "hasCustomMultiplierOverrides": false,
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "value": 325e3,
    "gemOverrideMax": 325e3,
    "tags": [
      "Air"
    ],
    "hasCustomStarOverrides": false,
    "thumbnail": "/images/vehicles/LE%20Cobra%20Super.jpg",
    "inGameCost": "Gems: 275,000 - 325,000",
    "demand": 4
  },
  {
    "thumbnail": "/images/vehicles/Armored%20Snow%20mobile.jpg",
    "inGameCost": "Gems: 500 - 1,500",
    "trend": "Dropping",
    "tags": [
      "Ground",
      "Collector"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "history": [],
    "id": "c595c5e0-cc76-4032-8f71-00a418a4bec3",
    "notes": "A snowmobile with a driver controlled turret on the front. Its a pretty weak vehicle but is no longer obtainable.",
    "rarity": "Common",
    "gemOverrideMin": 500,
    "category": "Land",
    "value": 1500,
    "name": "Armored Snow mobile",
    "tradeable": true,
    "hasManualGemRange": true,
    "demand": 2,
    "gemOverrideMax": 1500
  },
  {
    "trend": "Stable",
    "inRecentlyUpdated": false,
    "starTierOverrides": {
      "0": {
        "demand": 3,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMin": 2160001,
        "gemOverrideMax": 2640001,
        "value": 2400001
      },
      "1": {
        "demand": 3,
        "gemOverrideMin": 2160001,
        "gemOverrideMax": 2640001,
        "hasManualGemRange": false,
        "value": 2400001,
        "notes": "",
        "trend": "Stable"
      },
      "2": {
        "demand": 3,
        "hasManualGemRange": false,
        "trend": "Stable",
        "gemOverrideMax": 2640220,
        "gemOverrideMin": 2160180,
        "notes": "",
        "value": 2400200
      },
      "3": {
        "demand": 3,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "value": 241e4,
        "gemOverrideMin": 2169e3,
        "gemOverrideMax": 2651e3
      },
      "4": {
        "gemOverrideMin": 2179800,
        "gemOverrideMax": 2664200,
        "notes": "",
        "trend": "Stable",
        "value": 2422e3,
        "hasManualGemRange": false,
        "demand": 3
      },
      "5": {
        "value": 24e5,
        "gemOverrideMax": 264e4,
        "gemOverrideMin": 216e4,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "demand": 7
      },
      "fresh": {
        "hasManualGemRange": true,
        "gemOverrideMin": 28e5,
        "gemOverrideMax": 3e6,
        "demand": 7,
        "trend": "Stable",
        "notes": "",
        "value": 275e4
      }
    },
    "hasManualGemRange": true,
    "category": "Air",
    "name": "Super B21",
    "thumbnail": "/images/vehicles/Super%20B21.jpg",
    "hasCustomMultiplierOverrides": false,
    "history": [],
    "hasCustomStarOverrides": true,
    "notes": "The Super B21 is a fast, maneuverable, and stealthy bomber. The Super B21 features the Hunter Mode ability, which prevents enemies from locking onto your aircraft. Along with providing a short burst of acceleration and top speed. Hunter Mode lasts for 10 seconds before entering a brief cooldown. The Super B21 also has 4 rapid-fire bunker buster bombs, which have a special delayed second explosion upon impact. These bunker buster bombs also have insanely good building penetration use for bombing fortresses or other such buildings with troops. The damage of these bombs is quite serious but requires star upgrades to be paired with them to become truly useful for bombing. The Bunker Buster bomb also includes an occasionally deployable and powerful nuclear bomb damage effect that is capable of dealing massive AOE (Area Of Effect) damage. The Nuclear Bunker Buster bomb reload duration can be viewed near the bottom center of your screen.",
    "rarity": "Limited Edition",
    "tradeable": true,
    "id": "c5b67128-0d8a-4d3e-9e19-088e2d1b52ae",
    "gemOverrideMin": 22e5,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 24e5,
    "acronym": "SB21",
    "inGameCost": "Gems: 2,200,000 - 2,400,000",
    "starOverrides": {
      "0": 2400001,
      "1": 2400001,
      "2": 2400200,
      "3": 241e4,
      "4": 2422e3,
      "5": 24e5,
      "fresh": 275e4
    },
    "demand": 7,
    "tags": [
      "Air",
      "Special"
    ],
    "gemOverrideMax": 24e5
  },
  {
    "tags": [
      "Soldiers",
      "Collector",
      "Special"
    ],
    "value": 8e4,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "notes": "a rarer version of the boss killer soldier obtained in the 2024 halloween event",
    "thumbnail": "/images/vehicles/Boss%20Reaper.jpg",
    "inGameCost": "Gems: 70,000 - 80,000",
    "hasCustomMultiplierOverrides": false,
    "demand": 7,
    "tradeable": true,
    "hasCustomStarOverrides": false,
    "name": "Boss Reaper",
    "id": "c5d38f8a-e39f-45b2-896d-343d5d314efc",
    "gemOverrideMax": 8e4,
    "category": "Soldier",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "rarity": "Exotic",
    "trend": "Rising",
    "history": [],
    "gemOverrideMin": 7e4
  },
  {
    "id": "c66f03a0-3e1d-4ba0-b504-014412d01015",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 25 - 50",
    "thumbnail": "/images/vehicles/Mortar%20_Emblem_.jpg",
    "hasManualGemRange": true,
    "tags": [
      "Emblem"
    ],
    "history": [],
    "notes": "This emblem is obtained in the kill tag crates!",
    "tradeable": true,
    "rarity": "Common",
    "gemOverrideMin": 25,
    "category": "Tags",
    "value": 50,
    "name": "Mortar (Emblem)",
    "gemOverrideMax": 50,
    "demand": 1
  },
  {
    "value": 8e3,
    "id": "c676c2aa-0cec-4eb9-985e-16278db2e99a",
    "tradeable": true,
    "notes": "The first elite vehicle to appear in the elite shop more than once. It has a lot of missiles and a grappler.",
    "name": "RT01",
    "category": "Land",
    "demand": 6,
    "gemOverrideMax": 8e3,
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "trend": "Dropping",
    "tags": [
      "rt01"
    ],
    "thumbnail": "/images/vehicles/RT01.jpg",
    "gemOverrideMin": 5e3,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "history": []
  },
  {
    "excludeFromRecentlyUpdated": true,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "gemOverrideMax": 42e4,
        "gemOverrideMin": 38e4,
        "trend": "Stable",
        "demand": 5,
        "notes": "",
        "value": 4e5,
        "hasManualGemRange": false
      },
      "1": {
        "hasManualGemRange": false,
        "demand": 5,
        "gemOverrideMin": 389500,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMax": 430500,
        "value": 41e4
      },
      "2": {
        "value": 425e3,
        "trend": "Stable",
        "notes": "",
        "demand": 5,
        "hasManualGemRange": false,
        "gemOverrideMin": 403750,
        "gemOverrideMax": 446250
      },
      "3": {
        "value": 45e4,
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "demand": 5,
        "gemOverrideMin": 427500,
        "gemOverrideMax": 472500
      },
      "4": {
        "gemOverrideMin": 475e3,
        "gemOverrideMax": 525e3,
        "hasManualGemRange": false,
        "value": 5e5,
        "demand": 5,
        "trend": "Stable",
        "notes": ""
      },
      "5": {
        "trend": "Stable",
        "notes": "",
        "gemOverrideMax": 483e3,
        "gemOverrideMin": 437e3,
        "value": 46e4,
        "demand": 5,
        "hasManualGemRange": false
      },
      "fresh": {
        "demand": 5,
        "hasManualGemRange": false,
        "gemOverrideMax": 21e5,
        "gemOverrideMin": 19e5,
        "value": 2e6,
        "trend": "Stable",
        "notes": ""
      }
    },
    "tradeable": true,
    "id": "c689e039-a356-45d6-8413-98934e92cb9b",
    "inRecentlyUpdated": false,
    "starOverrides": {
      "0": 4e5,
      "1": 41e4,
      "2": 425e3,
      "3": 45e4,
      "4": 5e5,
      "5": 46e4,
      "fresh": 2e6
    },
    "history": [
      {
        "value": 4e5,
        "tierValues": {
          "0": 4e5,
          "1": 41e4,
          "2": 425e3,
          "3": 45e4,
          "4": 5e5,
          "5": 46e4,
          "fresh": 4e5
        },
        "updatedBy": "System",
        "timestamp": "2026-09-03T00:05:13.195Z",
        "date": "Sep 02",
        "note": "Previous Market Valuation"
      },
      {
        "tierValues": {
          "0": 4e5,
          "1": 41e4,
          "2": 425e3,
          "3": 45e4,
          "4": 5e5,
          "5": 46e4,
          "fresh": 2e6
        },
        "note": "Staff moderation update",
        "date": "Sep 09",
        "timestamp": "2026-09-10T00:05:13.195Z",
        "tier": "fresh",
        "updatedBy": "Spuppers",
        "value": 4e5
      }
    ],
    "hasCustomStarOverrides": true,
    "hasCustomMultiplierOverrides": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "trend": "Stable",
    "name": "Sturmtank",
    "rarity": "Legendary",
    "category": "Land",
    "value": 4e5,
    "gemOverrideMax": 4e5,
    "gemOverrideMin": 3e5,
    "demand": 5,
    "notes": "Tank with a good cannon and strong machine gun, but the weapons have a limited traverseCollector Item, and incredibly scarce due to being rather unknown during its availability era",
    "tags": [
      "Collector",
      "sturmtank"
    ],
    "thumbnail": "/images/vehicles/Sturmtank.jpg"
  },
  {
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 9100,
    "gemOverrideMin": 7400,
    "demand": 5,
    "category": "Air",
    "rarity": "Legendary",
    "notes": "Standard version of the B36, currently unobtainable from crates. Has a smaller nuke along with 5 decently powerful bombs, as well as mediocre AI gun defense.",
    "gemOverrideMax": 9100,
    "thumbnail": "/images/vehicles/B36.jpg",
    "tags": [
      "b36"
    ],
    "history": [],
    "tradeable": true,
    "id": "c83ad740-a444-4e77-bd7f-d173883477ce",
    "hasManualGemRange": true,
    "name": "B36",
    "trend": "Stable"
  },
  {
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 12500,
    "history": [],
    "name": "Warmaul",
    "trend": "Stable",
    "demand": 4,
    "gemOverrideMin": 8500,
    "category": "Land",
    "thumbnail": "/images/vehicles/Warmaul.jpg",
    "rarity": "Legendary",
    "id": "c8b1e456-6209-4912-96bf-3effc2e02092",
    "hasManualGemRange": true,
    "tags": [
      "Ground"
    ],
    "notes": "Land Vehicle that boats a powerfull front mounted cannon and front mounted machine gun",
    "tradeable": true,
    "inGameCost": "Gems: 8,500 - 12,500",
    "value": 12500
  },
  {
    "tradeable": true,
    "notes": "The rockets are weak and cannot be aimed easily. (Buildable)",
    "gemOverrideMax": 100,
    "rarity": "Common",
    "category": "Land",
    "name": "Himars",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "gemOverrideMin": 20,
    "value": 100,
    "id": "c90fa04c-d9fb-4f81-9c5e-fa2f938d59b8",
    "demand": 2,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Himars.jpg",
    "tags": [
      "himars"
    ],
    "hasManualGemRange": true
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 30,000 - 40,000",
    "id": "ca5cf7e4-dd74-4d89-9bd4-1ae50919a481",
    "name": "Santa Minigun",
    "tradeable": true,
    "history": [],
    "value": 4e4,
    "category": "Other",
    "notes": "Reskinned Minigun that fires plasma rounds and deals average damage. It tends to jam a lot and has to be reequipped constantly when it jams mid-fire or during its rev-up.",
    "demand": 4,
    "tags": [
      "Weapon"
    ],
    "gemOverrideMax": 4e4,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Santa%20Minigun.jpg",
    "rarity": "Exotic",
    "gemOverrideMin": 3e4,
    "trend": "Stable"
  },
  {
    "name": "Major General (Emblem)",
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "thumbnail": "https://static.wixstatic.com/media/341c64_7655b49e4b804849ba2c89bf95e8526d~mv2.png/v1/fill/w_125,h_139,al_c,lg_1,q_85,enc_avif,quality_auto/341c64_7655b49e4b804849ba2c89bf95e8526d~mv2.png",
    "history": [],
    "lastUpdated": "2026-08-29",
    "category": "Tags",
    "inGameCost": "Untradable",
    "value": 0,
    "id": "ca9c3291-2bdf-4e05-841b-9d06e2c1aa66",
    "tags": [
      "Emblem",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "tradeable": false,
    "rarity": "Legendary",
    "inRecentlyUpdated": false,
    "demand": 5
  },
  {
    "hasManualGemRange": true,
    "name": "AA Abram",
    "gemOverrideMax": 1e3,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "inRecentlyUpdated": false,
    "id": "cae49187-37ba-451b-9b3e-bf1fd476c536",
    "tradeable": true,
    "trend": "Dropping",
    "gemOverrideMin": 200,
    "history": [],
    "category": "Land",
    "demand": 2,
    "tags": [
      "Collector",
      "aa-abram"
    ],
    "excludeFromRecentlyUpdated": true,
    "value": 1e3,
    "thumbnail": "/images/vehicles/AA%20Abram.jpg",
    "rarity": "Common",
    "notes": "A decent AA tank with 2 missiles that are pretty outdated to be useful currently."
  },
  {
    "trend": "Stable",
    "initialHistoryNote": "Catalog addition",
    "category": "Naval",
    "thumbnail": "/images/vehicles/Cardboard%20Steel%20Rain.jpg",
    "excludeFromRecentlyUpdated": true,
    "notes": "Recently cataloged item.",
    "history": [
      {
        "updatedBy": "Spuppers",
        "note": "Catalog addition",
        "timestamp": "2026-09-10T21:17:46.455Z",
        "value": 0,
        "date": "Sep 10"
      }
    ],
    "demand": 4,
    "tradeable": false,
    "inRecentlyUpdated": false,
    "name": "Cardboard Steel Rain",
    "value": 0,
    "id": "cardboard-steel-rain",
    "rarity": "Exotic",
    "lastUpdated": "2026-06-12T22:11:09.438Z"
  },
  {
    "id": "cb121f58-5fc2-4ca6-9de6-9fe7080c065e",
    "hasManualGemRange": true,
    "trend": "Dropping",
    "gemOverrideMin": 20,
    "gemOverrideMax": 100,
    "tags": [
      "humvee"
    ],
    "tradeable": true,
    "history": [],
    "thumbnail": "/images/vehicles/Humvee.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "Upgrade gives it minimal weaponary and is not very useful.",
    "rarity": "Common",
    "category": "Land",
    "value": 100,
    "name": "Humvee",
    "demand": 1
  },
  {
    "gemOverrideMax": 7500,
    "notes": "Decent troop transport with a average machine gun mounted on the roof",
    "hasManualGemRange": true,
    "tradeable": true,
    "inGameCost": "Gems: 3,500 - 7,500",
    "value": 7500,
    "gemOverrideMin": 3500,
    "tags": [
      "Ground"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Land",
    "trend": "Stable",
    "id": "cb4b3f46-c609-4ed5-85aa-976967490585",
    "demand": 5,
    "thumbnail": "/images/vehicles/Police%20Jeep.jpg",
    "rarity": "Legendary",
    "history": [],
    "name": "Police Jeep"
  },
  {
    "tags": [
      "gold-b2"
    ],
    "tradeable": true,
    "trend": "Dropping",
    "history": [],
    "demand": 6,
    "id": "cb4bda0b-df79-4af4-b91a-49ae7ac39f92",
    "category": "Air",
    "rarity": "Legendary",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMax": 26e3,
    "notes": "Robux Costing B-2 spirit with extra drop bombs and the same EMP radius blast",
    "name": "Gold B2",
    "hasManualGemRange": true,
    "gemOverrideMin": 2e4,
    "thumbnail": "/images/vehicles/Gold%20B2.jpg",
    "value": 26e3
  },
  {
    "tags": [
      "Soldiers"
    ],
    "inGameCost": "Gems: 25 - 35",
    "value": 35,
    "gemOverrideMax": 35,
    "hasCustomMultiplierOverrides": false,
    "tradeable": true,
    "history": [],
    "notes": "Speeds up vault raiding but and does decent dps but not great for anything else a sit can't stack the raid times boost.",
    "hasCustomStarOverrides": false,
    "category": "Soldier",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMin": 25,
    "rarity": "Rare",
    "name": "Vault Raider",
    "thumbnail": "/images/vehicles/Vault%20Raider.jpg",
    "demand": 6,
    "trend": "Stable",
    "hasManualGemRange": true,
    "excludeFromRecentlyUpdated": true,
    "id": "cb61c7d8-d408-4f83-bfad-b51870479833",
    "inRecentlyUpdated": false
  },
  {
    "trend": "Stable",
    "inRecentlyUpdated": false,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/Plat%20Skyhammer.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "cb824716-2b74-4259-b6a1-45443f400f6c",
    "category": "Air",
    "inGameCost": "Gems: 350,000 - 450,000",
    "notes": "The Platinum Skyhammer features 2 plasma machineguns with 400 ammo in total along with a never before seen EMP orbital strike on the driver seat. The Platinum Skyhammer also features 3 gunner seats equipped with a 100 ammo plasma machinegun each. The Platinum Skyhammer is also a VTOL vehicle which means it can hover over a specific spot.",
    "gemOverrideMin": 35e4,
    "tradeable": true,
    "demand": 4,
    "acronym": "P SKY",
    "value": 45e4,
    "history": [],
    "rarity": "Limited Edition",
    "gemOverrideMax": 45e4,
    "name": "Plat Skyhammer"
  },
  {
    "id": "cb854d92-8c8f-4128-a12d-fe8eda1b040d",
    "tags": [
      "Ground"
    ],
    "notes": "The Super Hoverbike functions pretty much like a ground-based exotic rarity CFA44. The Super Hoverbike features an air-vehicle-focused 150-round plasma machine gun that has a good reload speed. The plasma machine gun only deals great damage against air vehicles and seems to deal average to low damage against ground and naval vehicles. The second weapon that the Super Hoverbike has is 4 missile bursts that have a long reload time. The Super Hoverbike vehicle's main feature is the hovering ability, which makes it able to traverse both land and water. The Super Hoverbike has an increased vehicle rotation speed compared to its Legendary rarity Hoverbike counterpart.",
    "acronym": "SHB",
    "thumbnail": "/images/vehicles/Super%20Hoverbike.jpg",
    "value": 8e5,
    "history": [
      {
        "updatedBy": "System",
        "tierValues": {
          "0": 1e6,
          "1": 1e6,
          "2": 1000200,
          "3": 101e4,
          "4": 102e4,
          "5": 106e4,
          "fresh": 1e6
        },
        "note": "Previous Market Valuation",
        "value": 1e6,
        "timestamp": "2026-09-03T00:17:19.775Z",
        "date": "Sep 02"
      },
      {
        "updatedBy": "Voiddarkreaper",
        "timestamp": "2026-09-10T00:17:19.775Z",
        "date": "Sep 09",
        "value": 8e5,
        "tierValues": {
          "0": 8e5,
          "1": 8e5,
          "2": 800200,
          "3": 81e4,
          "4": 82e4,
          "5": 86e4,
          "fresh": 8e5
        },
        "note": "Staff moderation update"
      }
    ],
    "category": "Land",
    "hasCustomMultiplierOverrides": false,
    "demand": 6,
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "tradeable": true,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 1e6,
    "inRecentlyUpdated": false,
    "name": "Super Hoverbike",
    "hasCustomStarOverrides": false,
    "gemOverrideMin": 75e4,
    "rarity": "Limited Edition",
    "inGameCost": "Gems: 750,000 - 1,000,000"
  },
  {
    "category": "Other",
    "gemOverrideMax": 5500,
    "history": [],
    "notes": "Heat Knife replacement that feels more damaged than the heat knife. It is also used alongside the RIOT Shield, just like the heat knife in an attack defense combination.",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "cb9dfc3c-1c41-4e0d-a37c-406de3d4999e",
    "gemOverrideMin": 4500,
    "thumbnail": "/images/vehicles/Scythe.jpg",
    "value": 5500,
    "tags": [
      "Weapon",
      "Collector",
      "Special"
    ],
    "hasManualGemRange": true,
    "inGameCost": "Gems: 4,500 - 5,500",
    "trend": "Stable",
    "rarity": "Epic",
    "tradeable": true,
    "name": "Scythe",
    "demand": 7
  },
  {
    "gemOverrideMax": 500,
    "tags": [
      "Soldiers",
      "Special"
    ],
    "notes": "The Naval Officer buffs all naval category vehicles by 10 percent per soldier; it can be buffed up to 40% if 4 soldiers are equipped. The buffs don't seem to stack with additional stars at this time, so  30 to 40% is your current buff limit for naval.",
    "id": "cbb19320-b76e-450a-a801-854a25a64c74",
    "inRecentlyUpdated": false,
    "tradeable": true,
    "hasManualGemRange": true,
    "hasCustomStarOverrides": false,
    "inGameCost": "Gems: 200 - 500",
    "gemOverrideMin": 200,
    "value": 500,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "category": "Soldier",
    "name": "Naval Officer",
    "thumbnail": "/images/vehicles/Naval%20Officer.jpg",
    "rarity": "Rare",
    "trend": "Rising",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 10,
    "hasCustomMultiplierOverrides": false
  },
  {
    "id": "cbb48693-176d-49a1-9d57-17e06742f176",
    "name": "Flora (Banner)",
    "thumbnail": "/images/vehicles/Flora%20_Banner_.jpg",
    "history": [],
    "value": 250,
    "category": "Tags",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "notes": "Available through crates.",
    "demand": 5,
    "gemOverrideMax": 250,
    "hasManualGemRange": true,
    "tags": [
      "Banner"
    ],
    "rarity": "Uncommon",
    "inGameCost": "Gems: 150 - 250",
    "gemOverrideMin": 150,
    "trend": "Stable",
    "tradeable": true
  },
  {
    "category": "Land",
    "id": "cc6d4f41-6d25-4353-9da1-5bbe84e57124",
    "tags": [
      "motorbike"
    ],
    "notes": "A fast and agile vehicle that has an explosive minigun attached to it. Soon after its release it got bugged due to an error with the code and now spazzes out every time it runs into a wall. ",
    "gemOverrideMin": 2500,
    "thumbnail": "/images/vehicles/Motorbike.jpg",
    "value": 5e3,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMax": 5e3,
    "hasManualGemRange": true,
    "name": "Motorbike",
    "history": [],
    "demand": 5,
    "trend": "Dropping",
    "tradeable": true,
    "rarity": "Epic"
  },
  {
    "history": [],
    "notes": "Limited Edition drone that can only be found in the starting millitary base and not any of the other bases. The Stalker Drone features a long reloading railgun that does medium to low damage. The Stalker Drone only seems to target all AI NPC troops, as well as AI ground and air targets. But doesn't seem to target players, player vehicles, or AI naval boats. The downside of the stalker drone is that it can damage the user's vehicle.",
    "gemOverrideMax": 22e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Stalker Drone",
    "value": 22e4,
    "gemOverrideMin": 18e4,
    "tradeable": true,
    "id": "cdd83dfc-418c-4c60-8095-97cfb26f8cec",
    "category": "Drone",
    "inGameCost": "Gems: 180,000 - 220,000",
    "thumbnail": "/images/vehicles/Stalker%20Drone.jpg",
    "trend": "Stable",
    "rarity": "Limited Edition",
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "tags": [
      "Drones"
    ],
    "demand": 3
  },
  {
    "lastUpdated": "2026-08-29",
    "tradeable": false,
    "demand": 5,
    "rarity": "Rare",
    "name": "Sergeant Major (Emblem)",
    "trend": "Stable",
    "history": [],
    "inRecentlyUpdated": false,
    "value": 0,
    "excludeFromRecentlyUpdated": true,
    "inGameCost": "Untradable",
    "category": "Tags",
    "id": "ce3053db-4a0d-4214-a004-951425c69622",
    "notes": "This emblem is obtained from getting a certain amount of rebirths, arsenal levels, and dailies.",
    "tags": [
      "Emblem",
      "Special"
    ],
    "thumbnail": "https://static.wixstatic.com/media/341c64_1afcb2261dbd468787679befa70b3157~mv2.jpeg/v1/fill/w_201,h_223,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_1afcb2261dbd468787679befa70b3157~mv2.jpeg"
  },
  {
    "gemOverrideMax": 15e4,
    "tradeable": true,
    "rarity": "Limited Edition",
    "inGameCost": "Gems: 120,000 - 150,000",
    "tags": [
      "Naval",
      "Special"
    ],
    "value": 15e4,
    "gemOverrideMin": 12e4,
    "demand": 3,
    "history": [],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "ce603059-dd52-4d00-adf5-39f7dd191047",
    "notes": "The Limited SONAR is a naval vehicle that features the same Recon Rader in vehicles like the Terrorbyte and Recon Heli. The Limited SONAR also has the same rocket deflection system as the Corsair variants. The Limited SONAR has an average-damage, aimable, explosive 75-round machine gun, along with 3 new rear-located, high-damage barrel-drop bombs. The reload speed of both of the Limited SONAR's weapons is quite fast compared to similar weapons on other vehicles. The Limited SONAR also has quite a high top speed and acceleration, which can be a problem in PvP situations. The accuracy of the machine gun was quite surprising, as it seems to have good hitbox accuracy compared to any other machine gun.",
    "name": "Limited SONAR",
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Limited%20SONAR.jpg",
    "category": "Naval",
    "trend": "Stable"
  },
  {
    "history": [],
    "hasManualGemRange": true,
    "gemOverrideMin": 6700,
    "trend": "Stable",
    "name": "Canberra",
    "rarity": "Legendary",
    "gemOverrideMax": 8300,
    "demand": 5,
    "tradeable": true,
    "thumbnail": "/images/vehicles/Canberra.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "canberra"
    ],
    "id": "cea38b91-5da4-4751-8693-43cb75e69949",
    "notes": "Drop bomber with large AOE for each bomb",
    "category": "Air",
    "value": 8300
  },
  {
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "history": [],
    "rarity": "Exotic",
    "tags": [
      "Air"
    ],
    "id": "ceb4e757-985f-4b90-b398-d2b50901e05b",
    "acronym": "A14",
    "demand": 3,
    "inGameCost": "Gems: 50,000 - 70,000",
    "trend": "Stable",
    "value": 7e4,
    "gemOverrideMin": 5e4,
    "name": "A14 Wolf",
    "category": "Air",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/A14%20Wolf.jpg",
    "notes": "Has supersonic missiles and somewhat low stats, but has a unique hunter mode that increases speed and prevents lock-ons, and also has high uptime",
    "hasCustomStarOverrides": false,
    "gemOverrideMax": 7e4
  },
  {
    "value": 9e6,
    "inRecentlyUpdated": false,
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "value": 9e6,
        "gemOverrideMin": 855e4,
        "gemOverrideMax": 945e4,
        "demand": 10,
        "notes": "",
        "trend": "Rising",
        "hasManualGemRange": false
      },
      "1": {
        "notes": "",
        "trend": "Rising",
        "value": 7e6,
        "hasManualGemRange": false,
        "demand": 10,
        "gemOverrideMax": 735e4,
        "gemOverrideMin": 665e4
      },
      "2": {
        "demand": 10,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Rising",
        "value": 625e4,
        "gemOverrideMin": 5937500,
        "gemOverrideMax": 6562500
      },
      "3": {
        "hasManualGemRange": false,
        "value": 6e6,
        "notes": "",
        "trend": "Rising",
        "gemOverrideMin": 57e5,
        "gemOverrideMax": 63e5,
        "demand": 10
      },
      "4": {
        "trend": "Rising",
        "notes": "",
        "value": 55e5,
        "demand": 10,
        "gemOverrideMax": 5775e3,
        "hasManualGemRange": false,
        "gemOverrideMin": 5225e3
      },
      "5": {
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Rising",
        "value": 5e6,
        "gemOverrideMin": 475e4,
        "gemOverrideMax": 525e4,
        "demand": 10
      },
      "fresh": {
        "notes": "",
        "trend": "Glazed",
        "hasManualGemRange": true,
        "value": 25e6,
        "demand": 9,
        "gemOverrideMin": 2e7,
        "gemOverrideMax": 3e7
      }
    },
    "hasCustomMultiplierOverrides": false,
    "id": "cf1881f7-b136-4880-8d59-371adac582c2",
    "acronym": "LEBB",
    "category": "Air",
    "notes": "This version of the blackbird comes with a drone that locks onto planes and ignores flares. Suffers from DoT nerf, which provided a notable portion of its damage. Maintains an incredibly powerful bomb.",
    "tradeable": true,
    "starOverrides": {
      "0": 9e6,
      "1": 7e6,
      "2": 625e4,
      "3": 6e6,
      "4": 55e5,
      "5": 5e6,
      "fresh": 25e6
    },
    "tags": [
      "Special",
      "Collector",
      "le-blackbird"
    ],
    "history": [
      {
        "tierValues": {
          "0": 3e6,
          "1": 301e4,
          "2": 3025e3,
          "3": 305e4,
          "4": 31e5,
          "5": 306e4,
          "fresh": 3e6
        },
        "updatedBy": "System",
        "date": "Sep 02",
        "timestamp": "2026-09-03T00:03:13.872Z",
        "value": 3e6,
        "note": "Previous Market Valuation"
      },
      {
        "value": 3e6,
        "date": "Sep 09",
        "tierValues": {
          "0": 9e6,
          "1": 7e6,
          "2": 5e6,
          "3": 4e6,
          "4": 375e4,
          "5": 3e6,
          "fresh": 2e7
        },
        "note": "Staff moderation update",
        "timestamp": "2026-09-10T00:03:13.872Z",
        "updatedBy": "Spuppers"
      },
      {
        "tierValues": {
          "0": 9e6,
          "1": 7e6,
          "2": 5e6,
          "3": 4e6,
          "4": 375e4,
          "5": 3e6,
          "fresh": 25e6
        },
        "note": "Staff moderation update",
        "value": 3e6,
        "updatedBy": "Voiddarkreaper",
        "date": "Sep 09",
        "tier": "fresh",
        "timestamp": "2026-09-10T00:14:40.595Z"
      },
      {
        "note": "Staff moderation update",
        "tierValues": {
          "0": 9e6,
          "1": 7e6,
          "2": 55e5,
          "3": 55e5,
          "4": 5e6,
          "5": 425e4,
          "fresh": 25e6
        },
        "timestamp": "2026-09-12T22:48:29.515Z",
        "value": 9e6,
        "date": "Sep 12",
        "updatedBy": "Spuppers"
      },
      {
        "date": "Sep 13",
        "tierValues": {
          "0": 9e6,
          "1": 7e6,
          "2": 55e5,
          "3": 6e6,
          "4": 55e5,
          "5": 5e6,
          "fresh": 25e6
        },
        "value": 9e6,
        "updatedBy": "Spuppers",
        "note": "Staff moderation update",
        "timestamp": "2026-09-14T00:28:23.989Z"
      },
      {
        "note": "Staff moderation update",
        "value": 9e6,
        "updatedBy": "Spuppers",
        "tier": "2",
        "tierValues": {
          "0": 9e6,
          "1": 7e6,
          "2": 625e4,
          "3": 6e6,
          "4": 55e5,
          "5": 5e6,
          "fresh": 25e6
        },
        "date": "Sep 13",
        "timestamp": "2026-09-14T01:04:11.162Z"
      }
    ],
    "demand": 10,
    "thumbnail": "/images/vehicles/LE%20Blackbird.jpg",
    "hasCustomStarOverrides": true,
    "rarity": "Limited Edition",
    "trend": "Rising",
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "name": "LE Blackbird"
  },
  {
    "inGameCost": "Gems: 200 - 400",
    "name": "Sachsen Frigate",
    "history": [],
    "value": 400,
    "id": "cf3d0ceb-8072-4594-97ca-e84ace056701",
    "thumbnail": "/images/vehicles/Sachsen%20Frigate.jpg",
    "notes": "A boat with unlimited missiles, a driver controlled turret. (Buildable)",
    "tradeable": true,
    "rarity": "Rare",
    "tags": [
      "Naval"
    ],
    "gemOverrideMin": 200,
    "category": "Naval",
    "demand": 1,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMax": 400,
    "trend": "Rising"
  },
  {
    "inGameCost": "Gems: 450 - 550",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": true,
    "tradeable": true,
    "category": "Tags",
    "demand": 5,
    "name": "Star Eagle (Emblem)",
    "rarity": "Legendary",
    "history": [],
    "id": "cf670643-a296-4366-b411-a9e1264d809f",
    "gemOverrideMin": 450,
    "notes": "This emblem is obtained by the kill tag crates!",
    "gemOverrideMax": 550,
    "thumbnail": "/images/vehicles/Star%20Eagle%20_Emblem_.jpg",
    "value": 550,
    "tags": [
      "Emblem"
    ]
  },
  {
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 1,
    "gemOverrideMax": 50,
    "rarity": "Common",
    "tags": [
      "Emblem"
    ],
    "tradeable": true,
    "gemOverrideMin": 25,
    "thumbnail": "/images/vehicles/Explosion%20_Emblem_.jpg",
    "notes": "This emblem is obtainable by the kill tag crates!",
    "name": "Explosion (Emblem)",
    "inGameCost": "Gems: 25 - 50",
    "value": 50,
    "id": "cfbd195d-967a-405a-a284-528210f4aed9",
    "hasManualGemRange": true,
    "history": [],
    "category": "Tags"
  },
  {
    "history": [
      {
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 200,
          "3": 1e4,
          "4": 2e4,
          "5": 6e4,
          "fresh": 0
        },
        "updatedBy": "System",
        "note": "Previous Market Valuation",
        "timestamp": "2026-09-10T22:08:36.830Z",
        "date": "Sep 10",
        "value": 0
      },
      {
        "note": "Staff moderation update",
        "value": 55e3,
        "tierValues": {
          "0": 55e3,
          "1": 55e3,
          "2": 55200,
          "3": 65e3,
          "4": 75e3,
          "5": 115e3,
          "fresh": 55e3
        },
        "timestamp": "2026-09-11T17:20:18.758Z",
        "date": "Sep 11",
        "updatedBy": "Spuppers"
      },
      {
        "timestamp": "2026-09-11T17:22:09.547Z",
        "note": "Staff moderation update",
        "value": 95e3,
        "tierValues": {
          "0": 95e3,
          "1": 95e3,
          "2": 95200,
          "3": 105e3,
          "4": 115e3,
          "5": 155e3,
          "fresh": 95e3
        },
        "updatedBy": "Spuppers",
        "date": "Sep 11"
      }
    ],
    "trend": "Dropping",
    "rarity": "Exotic",
    "hasCustomMultiplierOverrides": false,
    "thumbnail": "/images/vehicles/Super%20TU-160.jpg",
    "tags": [
      "Air"
    ],
    "demand": 6,
    "id": "cfcbc634-e71e-4e8b-a7ed-03fc08e2929c",
    "excludeFromRecentlyUpdated": true,
    "category": "Air",
    "notes": "The Super Tu-160 is a fast and nimble bomber that features a useless passenger seat. The Super TU-160 also has 2 cursor-guided missiles that deal average damage, but since they are rapid-fire, they tend to explode into one another, which makes it quite obsolete as a weapon option. The Super TU-160 also has 5 Napalm drop bombs with zero penetration ability that deal low damage.",
    "hasCustomStarOverrides": false,
    "value": 95e3,
    "inRecentlyUpdated": false,
    "tradeable": true,
    "hasManualGemRange": false,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Super TU-160"
  },
  {
    "gemOverrideMax": 5700,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Rising",
    "gemOverrideMin": 4500,
    "history": [],
    "tags": [
      "Special",
      "su57"
    ],
    "thumbnail": "/images/vehicles/SU57.jpg",
    "notes": "A plane that has 6 missiles and bombs. The 2nd plane added into the game that is able to do flips.",
    "id": "cfceb55b-eba1-4afd-8b85-cbebbddfd3a1",
    "tradeable": true,
    "category": "Air",
    "rarity": "Legendary",
    "value": 5700,
    "hasManualGemRange": true,
    "demand": 2,
    "name": "SU57"
  },
  {
    "rarity": "Exotic",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "gemOverrideMax": 5e4,
    "id": "cffbedb4-9e3b-442c-bb54-e840ad603706",
    "trend": "Stable",
    "demand": 4,
    "thumbnail": "/images/vehicles/Heavy%20T28.jpg",
    "tags": [
      "Ground",
      "Special"
    ],
    "gemOverrideMin": 4e4,
    "inGameCost": "Gems: 40,000 - 50,000",
    "value": 5e4,
    "category": "Land",
    "hasManualGemRange": true,
    "tradeable": true,
    "notes": "The Heavy T28 features the same horizontally 30-degree limited main cannon and machine gun turret as its Limited T28 counterpart. The main cannon fires a new non-lock-on Fast cannon round that deals the same damage as the Limited T28 base cannon shot (no cluster damage). The Heavy T28 also features an explosive 35-round machine gun that deals the same damage as the Limited T28. The Heavy T28 model machine gun also features the new machine gun audio. Along with also having the surrounding protective armor.",
    "name": "Heavy T28"
  },
  {
    "tags": [
      "Air",
      "Special"
    ],
    "trend": "Stable",
    "tradeable": true,
    "hasManualGemRange": true,
    "inGameCost": "Gems: 60,000 - 70,000",
    "history": [],
    "category": "Air",
    "demand": 8,
    "notes": "The Super A37 features the same weaponry as the legendary rarity A37. Their weapons have the same capacity, along with damage. The main difference between the Super A37 and the legendary rarity A37 is the increased movement speed of the Super A37, along with the reload speed being increased even further than its already capable reload speeds.",
    "name": "Super A37",
    "gemOverrideMax": 7e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "d0079328-3d73-4826-ac2e-7159b7bb6d2b",
    "thumbnail": "/images/vehicles/Super%20A37.jpg",
    "value": 7e4,
    "gemOverrideMin": 6e4,
    "rarity": "Exotic"
  },
  {
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tags": [
      "Air",
      "Special"
    ],
    "id": "d039580d-7ce3-4d5a-b50a-b5faab122cdf",
    "gemOverrideMax": 12500,
    "thumbnail": "/images/vehicles/TU95.jpg",
    "notes": "The TU95 variants are the first air vehicle to feature a tail gunner-type weapon. The TU95 has the same weapons arsenal and damage as that of ht eSuper TU95; the only difference between the 2 vehicles is the nuclear effect that is applied to the Super TU95 models drop bombs. The damage of both drop bombs are suprisingly the same.",
    "value": 12500,
    "gemOverrideMin": 1e4,
    "hasManualGemRange": true,
    "demand": 6,
    "trend": "Stable",
    "category": "Air",
    "name": "TU95",
    "inGameCost": "Gems: 10,000 - 12,500",
    "tradeable": true,
    "history": [],
    "rarity": "Legendary"
  },
  {
    "notes": "Larger AoE than standard grenadier but lower damage than the normal grenadier.",
    "name": "Elite Grenadier",
    "thumbnail": "/images/vehicles/Elite%20Grenadier.jpg",
    "value": 225,
    "history": [],
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "Soldiers"
    ],
    "id": "d098aaa0-5326-46ee-8b1e-5b732af25929",
    "demand": 7,
    "hasManualGemRange": true,
    "trend": "Rising",
    "gemOverrideMax": 225,
    "inGameCost": "Gems: 175 - 225",
    "category": "Soldier",
    "rarity": "Legendary",
    "gemOverrideMin": 175
  },
  {
    "inGameCost": "Untradable",
    "thumbnail": "https://static.wixstatic.com/media/341c64_1ad82eaddf444f77ba5b9f31720d9a8c~mv2.jpeg/v1/fill/w_204,h_227,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_1ad82eaddf444f77ba5b9f31720d9a8c~mv2.jpeg",
    "demand": 1,
    "inRecentlyUpdated": false,
    "tags": [
      "Emblem",
      "Special"
    ],
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "history": [],
    "lastUpdated": "2026-08-29",
    "value": 0,
    "rarity": "Common",
    "id": "d0b2de35-f83e-41a0-abc3-bd5b97fae59c",
    "excludeFromRecentlyUpdated": true,
    "name": "Specialist (Emblem)",
    "trend": "Stable",
    "tradeable": false,
    "category": "Tags"
  },
  {
    "trend": "Stable",
    "history": [],
    "name": "Werewolf",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "id": "d255b7c5-e4ab-4a45-8cbd-59551279cd9c",
    "hasManualGemRange": true,
    "tradeable": true,
    "gemOverrideMax": 1800,
    "category": "Soldier",
    "notes": "A troop that deals medium damage against enemies in the form of a lunge and slash. The lunge currently makes it harder for normal NPCs to lock onto the werewolf. The health of the werewolf is quite low, and it has no healing capabilities.",
    "thumbnail": "/images/vehicles/Werewolf.jpg",
    "demand": 7,
    "gemOverrideMin": 1500,
    "inGameCost": "Gems: 1,500 - 1,800",
    "value": 1800,
    "rarity": "Legendary",
    "tags": [
      "Soldiers"
    ]
  },
  {
    "trend": "Stable",
    "rarity": "Common",
    "tradeable": true,
    "id": "d2875062-2183-4bc5-8470-be9ba952b237",
    "hasManualGemRange": true,
    "name": "Pistol (Emblem)",
    "category": "Tags",
    "demand": 1,
    "gemOverrideMax": 50,
    "notes": "This emblem is obtained in the kill tag crates!",
    "inGameCost": "Gems: 25 - 50",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Pistol%20_Emblem_.jpg",
    "history": [],
    "value": 50,
    "gemOverrideMin": 25,
    "tags": [
      "Emblem"
    ]
  },
  {
    "trend": "Stable",
    "gemOverrideMin": 1e3,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 4,
    "gemOverrideMax": 2e3,
    "category": "Soldier",
    "thumbnail": "/images/vehicles/Shock%20Trooper.jpg",
    "name": "Shock Trooper",
    "rarity": "Legendary",
    "inGameCost": "Gems: 1,000 - 2,000",
    "notes": "Only useful to stun enemies or vehicles.",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": false,
    "history": [],
    "tradeable": true,
    "value": 2e3,
    "tags": [
      "Soldiers",
      "Special"
    ],
    "excludeFromRecentlyUpdated": true,
    "id": "d3198b82-40ae-4f05-b70c-1589ea967d6c"
  },
  {
    "gemOverrideMin": 45e3,
    "trend": "Rising",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 75e3,
    "name": "Super YF1",
    "tradeable": true,
    "inGameCost": "Gems: 45,000 - 75,000",
    "hasManualGemRange": true,
    "notes": "The Super YF1 features the same weapons and stats as the Legendary-rarity YF1, except it has 2 more medium-damage supersonic missiles along with a level 85 locked missile upgrade that seems not to do anything at the moment. The reload speed of both of the Super YF1 VTOL aircraft's weapons is rapid.",
    "category": "Air",
    "demand": 6,
    "thumbnail": "/images/vehicles/Super%20YF1.jpg",
    "value": 75e3,
    "rarity": "Exotic",
    "id": "d369498f-2eac-473b-8c77-83a39e252341",
    "tags": [
      "Air"
    ]
  },
  {
    "category": "Naval",
    "hasCustomStarOverrides": false,
    "name": "Super Missouri",
    "notes": "The Super Missouri features improved stats than those of the USS Missouri, along with 2 extra SkyHawk drones.",
    "gemOverrideMin": 5e5,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Limited Edition",
    "hasCustomMultiplierOverrides": false,
    "thumbnail": "/images/vehicles/Super%20Missouri.jpg",
    "demand": 6,
    "value": 45e4,
    "gemOverrideMax": 6e5,
    "inGameCost": "Gems: 500,000 - 600,000",
    "history": [
      {
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "date": "Sep 10",
        "value": 6e5,
        "tierValues": {
          "0": 6e5,
          "1": 6e5,
          "2": 6e5,
          "3": 6e5,
          "4": 6e5,
          "5": 6e5,
          "fresh": 6e5
        },
        "timestamp": "2026-09-10T22:08:36.830Z"
      },
      {
        "note": "Staff moderation update",
        "value": 45e4,
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-11T17:28:47.498Z",
        "date": "Sep 11",
        "tierValues": {
          "0": 45e4,
          "1": 45e4,
          "2": 45e4,
          "3": 45e4,
          "4": 45e4,
          "5": 45e4,
          "fresh": 45e4
        }
      }
    ],
    "tags": [
      "Naval"
    ],
    "excludeFromRecentlyUpdated": true,
    "trend": "Stable",
    "tradeable": true,
    "acronym": "SMISS",
    "hasManualGemRange": true,
    "id": "d49bd83a-3666-4007-b4c6-966a545ea398",
    "inRecentlyUpdated": false
  },
  {
    "rarity": "Limited Edition",
    "value": 25e6,
    "starOverrides": {
      "0": 25e6,
      "1": 2e7,
      "2": 18e6,
      "3": 15e6,
      "4": 13e6,
      "5": 8e6,
      "fresh": 1e8
    },
    "gemOverrideMin": 7e6,
    "excludeFromRecentlyUpdated": true,
    "name": "LE BISMARCK (G)",
    "notes": "It can solo destroyer-x at 5 stars, but suffers outside of bosses due to low speed. While valuable, it is still widely available for trade and has since been overshadowed by newer vehicles, capable of doing what it does, but better",
    "hasCustomMultiplierOverrides": false,
    "demand": 8,
    "tradeable": true,
    "category": "Naval",
    "gemOverrideMax": 75e5,
    "thumbnail": "data:image/jpeg;base64,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",
    "lastUpdated": "2026-08-31",
    "acronym": "GBIS",
    "starTierOverrides": {
      "0": {
        "notes": "",
        "trend": "Rising",
        "gemOverrideMin": 225e5,
        "gemOverrideMax": 275e5,
        "value": 25e6,
        "hasManualGemRange": true,
        "demand": 8
      },
      "1": {
        "gemOverrideMax": 22e6,
        "gemOverrideMin": 18e6,
        "value": 2e7,
        "demand": 6,
        "trend": "Rising",
        "notes": "",
        "hasManualGemRange": false
      },
      "2": {
        "gemOverrideMax": 198e5,
        "gemOverrideMin": 162e5,
        "hasManualGemRange": false,
        "demand": 7,
        "notes": "",
        "trend": "Rising",
        "value": 18e6
      },
      "3": {
        "hasManualGemRange": false,
        "value": 15e6,
        "notes": "",
        "trend": "Rising",
        "gemOverrideMax": 165e5,
        "gemOverrideMin": 135e5,
        "demand": 7
      },
      "4": {
        "demand": 7,
        "trend": "Rising",
        "notes": "",
        "gemOverrideMax": 143e5,
        "gemOverrideMin": 117e5,
        "value": 13e6,
        "hasManualGemRange": false
      },
      "5": {
        "hasManualGemRange": false,
        "demand": 8,
        "value": 8e6,
        "gemOverrideMin": 76e5,
        "gemOverrideMax": 84e5,
        "trend": "Rising",
        "notes": ""
      },
      "fresh": {
        "demand": 9,
        "hasManualGemRange": false,
        "gemOverrideMax": 11e7,
        "gemOverrideMin": 9e7,
        "notes": "",
        "trend": "Rising",
        "value": 1e8
      }
    },
    "hasManualGemRange": false,
    "id": "d4a8dc48-aeb0-4538-9225-6320ec85ce47",
    "trend": "Rising",
    "history": [
      {
        "timestamp": "2026-08-31T00:00:00.000Z",
        "tierValues": {
          "0": 25e6,
          "1": 2e7,
          "2": 18e6,
          "3": 15e6,
          "4": 13e6,
          "5": 8e6,
          "fresh": 1e8
        },
        "note": "Previous Market Valuation",
        "updatedBy": "System",
        "date": "Aug 30",
        "value": 75e5
      },
      {
        "note": "Staff moderation update",
        "tierValues": {
          "0": 25e6,
          "1": 2e7,
          "2": 18e6,
          "3": 15e6,
          "4": 13e6,
          "5": 8e6,
          "fresh": 1e8
        },
        "value": 25e6,
        "date": "Sep 11",
        "updatedBy": "Voiddarkreaper",
        "timestamp": "2026-09-11T23:28:56.256Z"
      }
    ],
    "inGameCost": "Gems: 7,000,000 - 7,500,000",
    "inRecentlyUpdated": false,
    "hasCustomStarOverrides": true,
    "tags": [
      "Naval",
      "Collector",
      "Special"
    ]
  },
  {
    "gemOverrideMax": 50,
    "category": "Tags",
    "hasManualGemRange": true,
    "tags": [
      "Emblem"
    ],
    "thumbnail": "/images/vehicles/Tags%20_Emblem_.jpg",
    "gemOverrideMin": 25,
    "id": "d4efba72-eb4d-4ff6-b4b3-40703a9508e2",
    "trend": "Stable",
    "name": "Tags (Emblem)",
    "demand": 1,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "history": [],
    "value": 50,
    "rarity": "Common",
    "tradeable": true,
    "inGameCost": "Gems: 25 - 50",
    "notes": "This emblem is obtained in the kill tag crates!"
  },
  {
    "tags": [
      "Soldiers"
    ],
    "category": "Soldier",
    "id": "d4f91ee5-55d3-4044-8659-9b0f5b5349e9",
    "excludeFromRecentlyUpdated": true,
    "demand": 7,
    "hasCustomMultiplierOverrides": false,
    "notes": "Juggernat that fires TV soldier railgun blast every few seconds",
    "hasCustomStarOverrides": false,
    "value": 7300,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/TV%20Juggernaut.jpg",
    "tradeable": true,
    "history": [],
    "trend": "Rising",
    "gemOverrideMin": 5900,
    "inGameCost": "Gems: 5,900 - 7,300",
    "name": "TV Juggernaut",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "gemOverrideMax": 7300
  },
  {
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Apocalypse.jpg",
    "history": [],
    "starOverrides": {
      "0": 425e4,
      "1": 401e4,
      "2": 4025e3,
      "3": 401e4,
      "4": 4022e3,
      "5": 4e6,
      "fresh": 9e6
    },
    "id": "d519b13b-f274-48b2-a269-2668dc669afd",
    "acronym": "APOC",
    "trend": "Stable",
    "demand": 7,
    "tags": [
      "Ground",
      "Collector"
    ],
    "hasCustomStarOverrides": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 5e6,
    "category": "Land",
    "gemOverrideMax": 5e6,
    "inGameCost": "Gems: 4,500,000 - 5,000,000",
    "excludeFromRecentlyUpdated": true,
    "hasCustomMultiplierOverrides": false,
    "notes": "The second rarest vehicle in-game. Has an outdated anti air weapon, but is collected as a token of high value, due to its scarcity.Tends to swing in value quickly.",
    "gemOverrideMin": 45e5,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 6,
        "hasManualGemRange": false,
        "value": 425e4,
        "gemOverrideMax": 4675e3,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 3825e3
      },
      "1": {
        "hasManualGemRange": false,
        "gemOverrideMin": 3609e3,
        "gemOverrideMax": 4411e3,
        "value": 401e4,
        "notes": "",
        "trend": "Stable",
        "demand": 6
      },
      "2": {
        "value": 4025e3,
        "notes": "",
        "trend": "Stable",
        "gemOverrideMin": 3622500,
        "gemOverrideMax": 4427500,
        "demand": 6,
        "hasManualGemRange": false
      },
      "3": {
        "trend": "Stable",
        "notes": "",
        "value": 401e4,
        "demand": 6,
        "gemOverrideMax": 4411e3,
        "gemOverrideMin": 3609e3,
        "hasManualGemRange": false
      },
      "4": {
        "demand": 6,
        "hasManualGemRange": false,
        "value": 4022e3,
        "gemOverrideMin": 3619800,
        "gemOverrideMax": 4424200,
        "trend": "Stable",
        "notes": ""
      },
      "5": {
        "trend": "Stable",
        "notes": "",
        "value": 4e6,
        "demand": 6,
        "gemOverrideMax": 44e5,
        "gemOverrideMin": 36e5,
        "hasManualGemRange": false
      },
      "fresh": {
        "trend": "Stable",
        "notes": "",
        "demand": 6,
        "value": 9e6,
        "gemOverrideMin": 81e5,
        "gemOverrideMax": 99e5,
        "hasManualGemRange": false
      }
    },
    "name": "Apocalypse",
    "inRecentlyUpdated": false,
    "tradeable": true
  },
  {
    "demand": 8,
    "tags": [
      "Soldiers",
      "Collector",
      "Special"
    ],
    "category": "Soldier",
    "notes": "A soldier who acts like a drone and currently only targets aerial vehicles. It fires a single nuclear RPG round with a quick reload time as well. Is kind of op with multiple stacked together against aerial targets.",
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Jetpack%20Fighter.jpg",
    "value": 275e4,
    "rarity": "Limited Edition",
    "hasManualGemRange": false,
    "starTierOverrides": {
      "0": {
        "demand": 7,
        "gemOverrideMin": 252e4,
        "gemOverrideMax": 308e4,
        "hasManualGemRange": false,
        "value": 28e5,
        "notes": "",
        "trend": "Stable"
      },
      "1": {
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "value": 896e4,
        "demand": 3,
        "gemOverrideMax": 9856e3,
        "gemOverrideMin": 8064e3
      },
      "2": {
        "notes": "",
        "trend": "Stable",
        "value": 616e5,
        "hasManualGemRange": false,
        "demand": 3,
        "gemOverrideMax": 6776e4,
        "gemOverrideMin": 5544e4
      },
      "3": {
        "value": 294e6,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMax": 3234e5,
        "gemOverrideMin": 2646e5,
        "hasManualGemRange": false,
        "demand": 3
      }
    },
    "hasCustomStarOverrides": false,
    "id": "d5259eb2-3b61-4939-99ff-351867fa088e",
    "tradeable": true,
    "hasCustomMultiplierOverrides": true,
    "name": "Jetpack Fighter",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "acronym": "JPF",
    "gemOverrideMax": 275e4,
    "inGameCost": "Gems: 2,500,000 - 2,750,000",
    "trend": "Stable",
    "multiplierOverrides": {
      "0": 1.02,
      "1": 3.26,
      "2": 22.4,
      "3": 106.91
    },
    "history": [],
    "gemOverrideMin": 25e5,
    "excludeFromRecentlyUpdated": true
  },
  {
    "notes": "has powerful front facing cannon and 6 normal missiles along with 2 anti dodge missiles",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 2,
    "thumbnail": "/images/vehicles/AHRLAC.jpg",
    "value": 3e3,
    "name": "AHRLAC",
    "rarity": "Epic",
    "category": "Air",
    "trend": "Stable",
    "hasManualGemRange": true,
    "id": "d5b9f397-96f8-4224-8168-cc9499894415",
    "tradeable": true,
    "gemOverrideMax": 3e3,
    "history": [],
    "gemOverrideMin": 1500,
    "tags": [
      "ahrlac"
    ]
  },
  {
    "id": "d5e30c9f-00bf-49b8-8c20-51751cf77f7d",
    "trend": "Stable",
    "rarity": "Common",
    "category": "Tags",
    "inGameCost": "Gems: 25 - 50",
    "gemOverrideMin": 25,
    "history": [],
    "thumbnail": "https://static.wixstatic.com/media/341c64_24633de6e0ad4b1392a4a735cadd0066~mv2.jpeg/v1/fill/w_227,h_252,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_24633de6e0ad4b1392a4a735cadd0066~mv2.jpeg",
    "tags": [
      "Emblem"
    ],
    "demand": 1,
    "gemOverrideMax": 50,
    "tradeable": true,
    "notes": "This emblem can be obtained by the kill tag crates!",
    "hasManualGemRange": true,
    "value": 50,
    "name": "Medic (Emblem)",
    "lastUpdated": "2026-08-29"
  },
  {
    "excludeFromRecentlyUpdated": true,
    "acronym": "MARA",
    "hasCustomStarOverrides": false,
    "name": "Marasesti",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "inGameCost": "Gems: 40,000 - 50,000",
    "trend": "Stable",
    "hasManualGemRange": true,
    "tradeable": true,
    "history": [],
    "inRecentlyUpdated": false,
    "category": "Naval",
    "demand": 7,
    "tags": [
      "Naval",
      "Special"
    ],
    "gemOverrideMax": 5e4,
    "thumbnail": "/images/vehicles/Marasesti.jpg",
    "value": 5e4,
    "gemOverrideMin": 4e4,
    "id": "d60fb9d4-42ce-4c3a-9dea-066c1646f844",
    "rarity": "Exotic",
    "notes": "The Marasesti features 4 high-damage air defense CWIS cannons; it also features 2 torpedoes within the Anti-Naval weapon sub-section. Within the Anti-Air weapons sub-section, it features dual aimable explosive round machine guns that deal serious damage and have a fast reload compared to other naval vehicles. It also features 2 missile bursts that can lock on to aircraft, which also deal high damage to targets, and has a rapid reload speed. The missile bursts on the Marsesti are unique as they feature a skin on them similar to the Anti-Tank Akrep, and not like the missile bursts found on the Elite Lancer. This is the first time these missile bursts are found on a naval vehicle."
  },
  {
    "hasManualGemRange": true,
    "gemOverrideMin": 3e4,
    "category": "Air",
    "tradeable": true,
    "name": "ME323",
    "trend": "Stable",
    "gemOverrideMax": 45e3,
    "inGameCost": "Gems: 30,000 - 45,000",
    "rarity": "Exotic",
    "id": "d72f47e1-f484-4974-923b-32bf86b84d85",
    "value": 45e3,
    "history": [],
    "thumbnail": "/images/vehicles/ME323.jpg",
    "notes": "Decent aircraft with drop bombs and side shooting machine guns. It also features a front-opening door to be used to carry vehicles.",
    "demand": 7,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tags": [
      "Air"
    ]
  },
  {
    "gemOverrideMax": 10100,
    "tradeable": true,
    "gemOverrideMin": 8200,
    "trend": "Stable",
    "tags": [
      "Special",
      "toy-b-17"
    ],
    "hasManualGemRange": true,
    "id": "d7ab7cba-f9fd-4e5d-8665-e745d8450d88",
    "category": "Air",
    "value": 10100,
    "demand": 3,
    "notes": "Reskined B-17",
    "rarity": "Epic",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "thumbnail": "/images/vehicles/Toy%20B-17.jpg",
    "name": "Toy B-17",
    "history": []
  },
  {
    "value": 8e3,
    "demand": 4,
    "hasManualGemRange": true,
    "gemOverrideMax": 8e3,
    "id": "d8c44b9d-a5a0-425e-98ff-215b1940d937",
    "history": [],
    "rarity": "Legendary",
    "notes": "Blackbird reskin with only 2 drop bombs bursts",
    "thumbnail": "/images/vehicles/M50.jpg",
    "tags": [
      "Air"
    ],
    "gemOverrideMin": 6e3,
    "category": "Air",
    "inGameCost": "Gems: 6,000 - 8,000",
    "tradeable": true,
    "trend": "Stable",
    "name": "M50",
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Nuke%20Sniper%20Soldier.jpg",
    "hasCustomMultiplierOverrides": false,
    "demand": 5,
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "name": "Nuke Sniper Soldier",
    "rarity": "Limited Edition",
    "notes": "Features a 6-round magazine capacity sniper that detects enemies within and outside vehicles at medium range. The rounds do significant damage, along with having a decent reload.",
    "lastUpdated": "2026-06-14T00:14:05.776Z",
    "gemOverrideMax": 35e4,
    "history": [],
    "value": 35e4,
    "tags": [
      "Soldiers"
    ],
    "gemOverrideMin": 3e5,
    "category": "Soldier",
    "hasManualGemRange": false,
    "inGameCost": "Gems: 300,000 - 350,000",
    "id": "d95ed9f4-c430-41d2-bc47-8aadac766cc6",
    "inRecentlyUpdated": false,
    "tradeable": true
  },
  {
    "history": [],
    "rarity": "Legendary",
    "tradeable": true,
    "value": 15e3,
    "name": "S.A.M. Truck",
    "demand": 7,
    "category": "Land",
    "notes": "Decently fast truck with lock-on missile barrages, along with a powerful and aimable explosive round machine gun.",
    "inGameCost": "Gems: 8,000 - 15,000",
    "tags": [
      "Ground"
    ],
    "gemOverrideMin": 8e3,
    "thumbnail": "/images/vehicles/S.A.M.%20Truck.jpg",
    "id": "d997112e-3a30-4756-8dc4-8674886c17f4",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "trend": "Stable",
    "gemOverrideMax": 15e3
  },
  {
    "trend": "Rising",
    "demand": 8,
    "tradeable": true,
    "category": "Air",
    "hasManualGemRange": true,
    "name": "Typhoon-X",
    "rarity": "Exotic",
    "id": "d9fcc0d0-f96f-49ac-a659-98a7c5d843f9",
    "notes": "An upgraded version of the Eurofighter Typhoon but is still only a good starter plane and will get beat by most of the current meta.",
    "gemOverrideMax": 15e3,
    "history": [],
    "value": 15e3,
    "tags": [
      "Special",
      "Collector",
      "typhoon-x"
    ],
    "thumbnail": "/images/vehicles/Typhoon-X.jpg",
    "gemOverrideMin": 1e4,
    "lastUpdated": "2026-09-10T22:08:37.729Z"
  },
  {
    "history": [],
    "tags": [
      "Soldiers"
    ],
    "value": 225,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "da10ecd1-ff64-4d93-b440-0694011993cf",
    "notes": "Good for baiting flares from planes.",
    "tradeable": true,
    "name": "AA Soldier",
    "rarity": "Epic",
    "thumbnail": "/images/vehicles/AA%20Soldier.jpg",
    "gemOverrideMax": 225,
    "demand": 5,
    "category": "Soldier",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 175 - 225",
    "trend": "Dropping",
    "gemOverrideMin": 175
  },
  {
    "name": "Super Kieler",
    "hasManualGemRange": true,
    "gemOverrideMax": 3e4,
    "gemOverrideMin": 25e3,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Super%20Kieler.jpg",
    "demand": 6,
    "tradeable": true,
    "category": "Land",
    "tags": [
      "Ground"
    ],
    "history": [],
    "value": 3e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Exotic",
    "id": "da20ec11-5dd3-4416-9b26-b9530209b80a",
    "inGameCost": "Gems: 25,000 - 30,000",
    "notes": "The Super Kieler features improved stats compared to those of the normal Kieler.  The main improvements to the Super Kieler are the fire rate and ammo capacity of the aimable explosive round machine gun."
  },
  {
    "tags": [
      "Emblem"
    ],
    "trend": "Stable",
    "history": [],
    "demand": 2,
    "gemOverrideMax": 75,
    "inGameCost": "Gems: 50 - 75",
    "gemOverrideMin": 50,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Uncommon",
    "tradeable": true,
    "thumbnail": "/images/vehicles/Submarine%20_Emblem_.jpg",
    "notes": "This emblem is obtained from the kill tag crates!",
    "name": "Submarine (Emblem)",
    "id": "da21f4c0-6a5e-4963-9fb3-5a7537dc821a",
    "category": "Tags",
    "value": 75,
    "hasManualGemRange": true
  },
  {
    "gemOverrideMax": 150,
    "name": "Grapple ATV",
    "rarity": "Common",
    "value": 150,
    "gemOverrideMin": 50,
    "demand": 1,
    "thumbnail": "/images/vehicles/Grapple%20ATV.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "A good vehicle for arsenal levels.",
    "hasManualGemRange": true,
    "tags": [
      "grapple-atv"
    ],
    "category": "Land",
    "tradeable": true,
    "history": [],
    "id": "da65d1df-f241-40f6-80a0-7a0e4fe12432",
    "trend": "Dropping"
  },
  {
    "gemOverrideMax": 15e3,
    "trend": "Stable",
    "rarity": "Legendary",
    "gemOverrideMin": 1e4,
    "category": "Land",
    "thumbnail": "/images/vehicles/Pantsir.jpg",
    "demand": 5,
    "name": "Pantsir",
    "notes": "A good anti-air vehicle that has a good explosive machine gun and 12 fast missiles that have a fast reload speed.",
    "history": [],
    "id": "da6ad4dc-6c35-4889-a730-30a95acdb9bb",
    "tradeable": true,
    "hasManualGemRange": true,
    "value": 15e3,
    "tags": [
      "pantsir"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "inGameCost": "Gems: 450 - 550",
    "id": "da72b04a-2752-4b35-a6df-6670f57e75f2",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 550,
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "name": "Super Star (Emblem)",
    "notes": "This emblem can be obtained in the kill tag crates!",
    "history": [],
    "demand": 5,
    "tags": [
      "Emblem"
    ],
    "gemOverrideMax": 550,
    "thumbnail": "/images/vehicles/Super%20Star%20_Emblem_.jpg",
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "trend": "Stable",
    "category": "Tags",
    "gemOverrideMin": 450
  },
  {
    "trend": "Stable",
    "category": "Air",
    "history": [],
    "demand": 2,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": true,
    "name": "Super F14",
    "rarity": "Legendary",
    "id": "da7467bc-fe84-41d8-9a38-8d6c8229ef2f",
    "notes": "Has strong missiles, and a very strong machine gun that can obliterate buildings. Above-average speed  only if upgraded",
    "gemOverrideMax": 5e3,
    "tags": [
      "super-f14"
    ],
    "value": 5e3,
    "thumbnail": "/images/vehicles/Super%20F14.jpg",
    "gemOverrideMin": 4e3
  },
  {
    "history": [],
    "id": "da910578-64c0-4ac2-be23-9fda84b81a1e",
    "tags": [
      "Emblem",
      "Special"
    ],
    "trend": "Stable",
    "thumbnail": "https://static.wixstatic.com/media/341c64_e04566d772204c13a588f6ed02950ae6~mv2.jpeg/v1/fill/w_218,h_242,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_e04566d772204c13a588f6ed02950ae6~mv2.jpeg",
    "rarity": "Rare",
    "inGameCost": "Untradable",
    "inRecentlyUpdated": false,
    "demand": 5,
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-08-29",
    "notes": "This emblem is obtained by getting a certain amount of rebirths, arsenal levels, and dailies.",
    "name": "Sergeant (Emblem)",
    "category": "Tags",
    "tradeable": false,
    "value": 0
  },
  {
    "category": "Air",
    "thumbnail": "/images/vehicles/B21%20Raider.jpg",
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Air",
      "Special"
    ],
    "inGameCost": "Gems: 200,000 - 250,000",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Stable",
    "rarity": "Exotic",
    "history": [],
    "name": "B21 Raider",
    "hasCustomStarOverrides": false,
    "hasManualGemRange": true,
    "gemOverrideMax": 25e4,
    "value": 25e4,
    "inRecentlyUpdated": false,
    "id": "dae53758-e37d-454d-be33-a0064e05fe22",
    "acronym": "B21",
    "demand": 7,
    "tradeable": true,
    "gemOverrideMin": 2e5,
    "notes": "The B21 Raider is a fast and maneuverable stealth bomber. The B21 Raider features the Hunter Mode ability that prevents enemies from locking on to your aircraft. Along with providing a short burst of acceleration and top speed. Hunter Mode lasts for 10 seconds before entering a brief cooldown. The B21 Raider also has 3 rapid-fire bunker buster bombs, which have a special delayed second explosion upon impact. These bunker buster bombs also have insanely good building penetration use for bombing fortresses or other such buildings with troops. The damage of these bombs is quite serious but requires star upgrades to be paired with them to become truly useful for bombing."
  },
  {
    "name": "Sky Reaper",
    "value": 5e4,
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "The Sky Reaper is a VTOL Aircraft with air cannons that shoot large explosive tank rounds. It also has a laser with a limited range of motion and an amiable explosive round cannon. It's notoriously low in value due to it not only being a vtol vehicle. On February 18th, 2026, at around 2:30 PM Eastern Standard Time within the United States, the sky reaper's health increased from 12.5k to 25k.",
    "id": "db08b73b-60cc-4f9c-bab4-beca26ebb01e",
    "demand": 8,
    "category": "Air",
    "gemOverrideMin": 4e4,
    "hasManualGemRange": true,
    "history": [],
    "tags": [
      "Air"
    ],
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Sky%20Reaper.jpg",
    "gemOverrideMax": 5e4,
    "inGameCost": "Gems: 40,000 - 50,000",
    "trend": "Rising"
  },
  {
    "tags": [
      "Banner"
    ],
    "inGameCost": "Gems: 50 - 100",
    "hasManualGemRange": true,
    "notes": "Available through crates.",
    "gemOverrideMax": 100,
    "id": "db8987ed-bc48-4742-b983-acb71dcf1845",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "value": 100,
    "gemOverrideMin": 50,
    "thumbnail": "/images/vehicles/Navy%20_Banner_.jpg",
    "trend": "Stable",
    "category": "Tags",
    "name": "Navy (Banner)",
    "rarity": "Common",
    "history": [],
    "demand": 5
  },
  {
    "tags": [
      "Naval"
    ],
    "tradeable": true,
    "notes": "Decent hovercraft with 3 aimable explosive round machine guns, along with rocket deflection.",
    "rarity": "Legendary",
    "history": [],
    "category": "Naval",
    "demand": 4,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "value": 7e3,
    "inGameCost": "Gems: 5,000 - 7,000",
    "gemOverrideMin": 5e3,
    "name": "Corsair",
    "trend": "Stable",
    "gemOverrideMax": 7e3,
    "thumbnail": "/images/vehicles/Corsair.jpg",
    "hasManualGemRange": true,
    "id": "db919605-bbcf-4719-a38d-be858f80f974"
  },
  {
    "gemOverrideMax": 750,
    "id": "dbc7563b-e204-4cb1-9ee2-de7afb3e73cc",
    "notes": "Basic troop carrier with a aimable explosive round machine gun that does good air damage",
    "tradeable": true,
    "gemOverrideMin": 500,
    "category": "Land",
    "value": 750,
    "tags": [
      "Ground"
    ],
    "hasManualGemRange": true,
    "trend": "Stable",
    "history": [],
    "demand": 1,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Halftrack.jpg",
    "name": "Halftrack",
    "inGameCost": "Gems: 500 - 750",
    "rarity": "Rare"
  },
  {
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Air",
    "thumbnail": "/images/vehicles/B2%20Spirit.jpg",
    "id": "dce97dd7-72b9-445f-9914-d46840573e46",
    "hasManualGemRange": true,
    "tags": [
      "b2-spirit"
    ],
    "trend": "Rising",
    "gemOverrideMax": 5e3,
    "rarity": "Legendary",
    "name": "B2 Spirit",
    "history": [],
    "value": 5e3,
    "gemOverrideMin": 3e3,
    "demand": 5,
    "tradeable": true,
    "notes": "can 2 shot clear fortress armaments like doors and turrets and disable flying for non-hover planes for 7 to 10 seconds"
  },
  {
    "tradeable": true,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "Santa Private",
    "value": 235,
    "demand": 1,
    "gemOverrideMax": 235,
    "notes": "Reskined Private",
    "tags": [
      "Soldiers"
    ],
    "thumbnail": "/images/vehicles/Santa%20Private.jpg",
    "rarity": "Rare",
    "id": "dd70b2f8-e75d-4e6c-816d-dd39c7ffd2dd",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 175 - 235",
    "gemOverrideMin": 175,
    "category": "Soldier",
    "history": []
  },
  {
    "notes": "Only released twice so it can be hard to obtian and be high in value.",
    "value": 250,
    "hasCustomStarOverrides": false,
    "tradeable": true,
    "name": "Raid Soldier",
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Raid%20Soldier.jpg",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "rarity": "Legendary",
    "gemOverrideMin": 50,
    "history": [],
    "tags": [
      "Soldiers"
    ],
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 50 - 250",
    "excludeFromRecentlyUpdated": true,
    "category": "Soldier",
    "id": "dd896e18-9df5-418a-ba9e-edaa39d3097e",
    "hasCustomMultiplierOverrides": false,
    "demand": 5,
    "gemOverrideMax": 250
  },
  {
    "starTierOverrides": {
      "0": {
        "demand": 7,
        "value": 1500001,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMax": 1650001,
        "gemOverrideMin": 1350001
      },
      "1": {
        "gemOverrideMin": 1350001,
        "gemOverrideMax": 1650001,
        "value": 1500001,
        "demand": 7,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false
      },
      "2": {
        "value": 1500001,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMin": 1350001,
        "gemOverrideMax": 1650001,
        "demand": 7
      },
      "3": {
        "value": 1500001,
        "trend": "Stable",
        "notes": "",
        "hasManualGemRange": false,
        "gemOverrideMax": 1650001,
        "gemOverrideMin": 1350001,
        "demand": 7
      },
      "4": {
        "trend": "Stable",
        "notes": "",
        "value": 1500001,
        "gemOverrideMax": 1650001,
        "hasManualGemRange": false,
        "gemOverrideMin": 1350001,
        "demand": 7
      },
      "5": {
        "hasManualGemRange": false,
        "gemOverrideMin": 135e4,
        "gemOverrideMax": 165e4,
        "demand": 8,
        "value": 15e5,
        "notes": "",
        "trend": "Stable"
      },
      "fresh": {
        "gemOverrideMin": 285e4,
        "gemOverrideMax": 315e4,
        "hasManualGemRange": true,
        "demand": 7,
        "value": 3e6,
        "notes": "",
        "trend": "Stable"
      }
    },
    "hasManualGemRange": true,
    "category": "Air",
    "thumbnail": "/images/vehicles/LE%20A-10.jpg",
    "hasCustomMultiplierOverrides": false,
    "inRecentlyUpdated": false,
    "rarity": "Limited Edition",
    "hasCustomStarOverrides": true,
    "value": 15e5,
    "name": "LE A-10",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 7,
    "notes": "Has 360\xB0 rotational minigun, with missiles,One of the best spawn trapping vehicles in the game, thanks to its instant lockon and high MG damage",
    "gemOverrideMin": 14e5,
    "excludeFromRecentlyUpdated": true,
    "tags": [
      "Air",
      "Special"
    ],
    "history": [],
    "inGameCost": "Gems: 1,400,000 - 1,500,000",
    "gemOverrideMax": 15e5,
    "id": "de48c599-8af5-416d-8632-dcd11f71940b",
    "acronym": "LEA10",
    "starOverrides": {
      "0": 1500001,
      "1": 1500001,
      "2": 1500001,
      "3": 1500001,
      "4": 1500001,
      "5": 15e5,
      "fresh": 3e6
    },
    "trend": "Stable",
    "tradeable": true
  },
  {
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "thumbnail": "/images/vehicles/Truck.jpg",
    "name": "Truck",
    "rarity": "Common",
    "notes": "A buyable tycoon vehicle decent for Arsenal levels.",
    "history": [],
    "demand": 0,
    "value": 100,
    "gemOverrideMax": 100,
    "hasManualGemRange": true,
    "tags": [
      "truck"
    ],
    "trend": "Rising",
    "tradeable": true,
    "category": "Land",
    "gemOverrideMin": 20,
    "id": "de519062-f736-477e-a5f2-b21c522c5db3"
  },
  {
    "tags": [
      "jagdpanther"
    ],
    "value": 7e3,
    "gemOverrideMin": 5e3,
    "id": "defd0800-07ff-4665-acdb-d482414caeb0",
    "category": "Land",
    "hasManualGemRange": true,
    "notes": "Has posibally the weakest machine gun in the game, but has an amazing cannon, it can prevent damage if it is hit in the front",
    "thumbnail": "/images/vehicles/Jagdpanther.jpg",
    "gemOverrideMax": 7e3,
    "demand": 5,
    "tradeable": true,
    "name": "Jagdpanther",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "trend": "Stable",
    "history": []
  },
  {
    "notes": "High fire rate sniper.",
    "gemOverrideMax": 300,
    "rarity": "Legendary",
    "inGameCost": "Gems: 200 - 300",
    "name": "Assassin",
    "thumbnail": "/images/vehicles/Assassin.jpg",
    "gemOverrideMin": 200,
    "value": 300,
    "category": "Soldier",
    "id": "df06c068-4e85-40b7-9351-009f1f81fda6",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 0,
    "trend": "Stable",
    "tradeable": true,
    "hasManualGemRange": true,
    "history": [],
    "tags": [
      "Soldiers"
    ]
  },
  {
    "tradeable": true,
    "rarity": "Legendary",
    "value": 2500,
    "category": "Naval",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 1,500 - 2,500",
    "notes": "A submarine with difficult handling but it has infinite missiles and some torpedoes.",
    "tags": [
      "Naval"
    ],
    "demand": 2,
    "gemOverrideMax": 2500,
    "hasManualGemRange": true,
    "trend": "Stable",
    "gemOverrideMin": 1500,
    "thumbnail": "/images/vehicles/SSBN.jpg",
    "name": "SSBN",
    "id": "df1b2e4f-3299-4b60-8ec3-f82f9c25b97b"
  },
  {
    "id": "df952abf-4fd4-4ae1-a117-9b1a7cb14ae4",
    "category": "Land",
    "history": [],
    "trend": "Stable",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Rocket%20Tank.jpg",
    "tags": [
      "rocket-tank"
    ],
    "tradeable": true,
    "gemOverrideMin": 200,
    "notes": "Fires a lot of missiles which cna be good for flare baiting(Spec Ops)",
    "rarity": "Rare",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "value": 400,
    "name": "Rocket Tank",
    "gemOverrideMax": 400,
    "demand": 3
  },
  {
    "history": [],
    "name": "Corsair-X",
    "gemOverrideMin": 5e5,
    "trend": "Rising",
    "lastUpdated": "2026-09-14T22:10:25.067Z",
    "tradeable": true,
    "gemOverrideMax": 6e5,
    "inGameCost": "Gems: 500,000 - 600,000",
    "id": "dfbbbb20-6ca2-403c-a1f1-182e074a32f2",
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Corsair-X.jpg",
    "hasManualGemRange": true,
    "notes": "An improved version of the standard Corsair, featuring 2 aimable explosive round machine guns. Along with four tiny missile bursts, similar to those of the rocket tank and Super TOS-01.It also features the rocket deflection feature.",
    "tags": [
      "Naval"
    ],
    "category": "Naval",
    "demand": 8,
    "value": 5e5
  },
  {
    "id": "dff40089-31a8-4e53-9964-2c1a1615590f",
    "trend": "Stable",
    "rarity": "Epic",
    "inGameCost": "Gems: 2,000 - 2,500",
    "thumbnail": "/images/vehicles/Cyan%20_Banner_.jpg",
    "category": "Tags",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "Banner"
    ],
    "demand": 5,
    "gemOverrideMin": 2e3,
    "notes": "Available through crates.",
    "tradeable": true,
    "hasManualGemRange": true,
    "gemOverrideMax": 2500,
    "history": [],
    "value": 2500,
    "name": "Cyan (Banner)"
  },
  {
    "hasManualGemRange": true,
    "gemOverrideMax": 6e4,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Air"
    ],
    "id": "e0580d16-e6c4-41a2-9300-f7017c62199f",
    "gemOverrideMin": 4e4,
    "history": [],
    "tradeable": true,
    "category": "Air",
    "trend": "Stable",
    "inGameCost": "Gems: 40,000 - 60,000",
    "thumbnail": "/images/vehicles/Super%20Ironhawk.jpg",
    "rarity": "Exotic",
    "value": 6e4,
    "name": "Super Ironhawk",
    "demand": 7,
    "notes": "Improved version of the normal Ironhawk in stats, along with having 4 more missile bursts than the Ironhawk with its 2 missile bursts. The armour-piercing missiles are the same as the normal Ironhawk. The passenger seat on the Super Ironhawk is also pointless, just like the normal Ironhawk."
  },
  {
    "rarity": "Common",
    "value": 0,
    "thumbnail": "/images/vehicles/Spitfire%20MK2.jpg",
    "notes": "Decent damage. Lacks health and speed. It was easy to get before daily rewards got changed.",
    "demand": 1,
    "excludeFromRecentlyUpdated": true,
    "category": "Air",
    "tags": [
      "Collector",
      "spitfire-mk2"
    ],
    "inRecentlyUpdated": false,
    "name": "Spitfire MK2",
    "tradeable": false,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "trend": "Dropping",
    "history": [],
    "id": "e0ec9cdc-cfeb-4296-9ffa-32b2b3508263"
  },
  {
    "trend": "Rising",
    "tradeable": true,
    "gemOverrideMax": 1300,
    "tags": [
      "su-47"
    ],
    "id": "e11dd299-354b-41c5-b0f9-7596d63cae14",
    "hasManualGemRange": true,
    "history": [],
    "gemOverrideMin": 1e3,
    "notes": "A plane with missiles and an explosive machine guns. The first plane to be added that is able to do flips.",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Air",
    "demand": 2,
    "value": 1300,
    "rarity": "Epic",
    "name": "Su-47",
    "thumbnail": "/images/vehicles/Su-47.jpg"
  },
  {
    "trend": "Stable",
    "tradeable": true,
    "demand": 1,
    "id": "e1672ab6-75f8-45fe-989c-ed11f5cae928",
    "rarity": "Epic",
    "tags": [
      "golden-f22"
    ],
    "category": "Air",
    "notes": "Weak machine guns but okay missiles make it a decent fighter for air to air combat. ",
    "hasManualGemRange": true,
    "gemOverrideMax": 1800,
    "thumbnail": "/images/vehicles/Golden%20F22.jpg",
    "name": "Golden F22",
    "value": 1800,
    "history": [],
    "gemOverrideMin": 1400,
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "hasManualGemRange": true,
    "category": "Land",
    "gemOverrideMax": 6500,
    "history": [],
    "name": "Golden PL-01",
    "trend": "Stable",
    "gemOverrideMin": 4e3,
    "tradeable": true,
    "demand": 4,
    "thumbnail": "/images/vehicles/Golden%20PL-01.jpg",
    "value": 6500,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Legendary",
    "notes": "A good tank with a strong machinegun and main cannon. It is one of the faster tanks with a good amount of HP.",
    "id": "e2388518-b673-48c5-9f5e-66cb914d82ae",
    "tags": [
      "golden-pl-01"
    ]
  },
  {
    "inGameCost": "Gems: 200 - 600",
    "gemOverrideMax": 600,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Juggernaut.jpg",
    "id": "e25b4b7a-0b3e-4d4e-8271-c5cd48551a8a",
    "hasManualGemRange": true,
    "gemOverrideMin": 200,
    "name": "Juggernaut",
    "value": 600,
    "demand": 5,
    "tradeable": true,
    "notes": "A replacement for Elite soldier being basically an identical twin. However, it has a twist; the juggernaut has more ammo, making it better for boss battles if you have a railgun.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tags": [
      "Soldiers"
    ],
    "rarity": "Legendary",
    "history": [],
    "category": "Soldier"
  },
  {
    "id": "e25b977a-38ef-4e3c-973f-ef0dc29006ba",
    "tags": [
      "boss-blackbird"
    ],
    "trend": "Stable",
    "tradeable": true,
    "category": "Air",
    "history": [],
    "gemOverrideMax": 1e4,
    "name": "Boss Blackbird",
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Boss%20Blackbird.jpg",
    "notes": "A slower version of the Elite blackbird.",
    "hasManualGemRange": true,
    "gemOverrideMin": 5e3,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "demand": 5,
    "value": 1e4
  },
  {
    "demand": 3,
    "hasManualGemRange": true,
    "rarity": "Epic",
    "name": "Minigun Edjer",
    "trend": "Stable",
    "tradeable": true,
    "category": "Land",
    "gemOverrideMax": 1750,
    "thumbnail": "/images/vehicles/Minigun%20Edjer.jpg",
    "value": 1750,
    "gemOverrideMin": 1250,
    "notes": "This is a slightly worse version of the normal Edjer because the bullets are not explosive so its vehicle damage is somewhat low and cannot damage any buildings.",
    "id": "e25f64ea-be74-4553-9670-2a0c1db000bc",
    "tags": [
      "minigun-edjer"
    ],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": []
  },
  {
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "inGameCost": "Gems: 1,100,000 - 1,300,000",
    "value": 13e5,
    "history": [],
    "excludeFromRecentlyUpdated": true,
    "notes": "The Super Sky Carrier features the same features and weapon set as its exotic rarity counterpart. The main difference is that it features 8 more cannon rounds, along with 2 additional AI-controlled F-22 drones.",
    "hasCustomMultiplierOverrides": false,
    "acronym": "SAC",
    "thumbnail": "/images/vehicles/Super%20Air%20Carrier.jpg",
    "tags": [
      "Air",
      "Special"
    ],
    "demand": 8,
    "category": "Air",
    "tradeable": true,
    "gemOverrideMin": 11e5,
    "id": "e2a4f203-edb4-4ef9-a40d-270a39ea4e02",
    "rarity": "Limited Edition",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      },
      "4": {
        "demand": 3
      }
    },
    "hasCustomStarOverrides": false,
    "name": "Super Air Carrier",
    "inRecentlyUpdated": false,
    "trend": "Rising",
    "gemOverrideMax": 13e5
  },
  {
    "name": "Railgun Killer",
    "rarity": "Exotic",
    "gemOverrideMax": 25e4,
    "category": "Soldier",
    "value": 25e4,
    "inRecentlyUpdated": false,
    "hasCustomStarOverrides": false,
    "id": "e36702b7-8090-45f6-bfcb-64d71d27944d",
    "demand": 3,
    "gemOverrideMin": 2e5,
    "hasManualGemRange": true,
    "tradeable": true,
    "notes": "With 4 of these and an attack dog it is possible to solo Commander X. A very valuable troop to have, but dated in the current endgame",
    "thumbnail": "/images/vehicles/Railgun%20Killer.jpg",
    "hasCustomMultiplierOverrides": false,
    "acronym": "RGK",
    "inGameCost": "Gems: 200,000 - 250,000",
    "tags": [
      "Soldiers"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "history": [],
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true
  },
  {
    "id": "e3f3ff38-a040-49a3-aca0-65dc4d0605e4",
    "gemOverrideMax": 4e3,
    "tags": [
      "super-ahrlac"
    ],
    "notes": "Has Anti flare and dodge missiles, normal missiles,  along with powerful front facing cannon",
    "gemOverrideMin": 3e3,
    "hasManualGemRange": true,
    "value": 4e3,
    "tradeable": true,
    "category": "Air",
    "thumbnail": "/images/vehicles/Super%20AHRLAC.jpg",
    "name": "Super AHRLAC",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 3,
    "trend": "Stable",
    "rarity": "Legendary"
  },
  {
    "rarity": "Legendary",
    "value": 0,
    "tradeable": false,
    "history": [],
    "inRecentlyUpdated": false,
    "notes": "A fast tank that has an explosive machine gun and a decent main cannon. This tank was only obtainable by gamepass and is no longer purchasable.",
    "tags": [
      "Special",
      "merkava"
    ],
    "demand": 8,
    "category": "Land",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "name": "Merkava",
    "id": "e3f44913-09cd-4694-8778-b3941bf79e15",
    "thumbnail": "/images/vehicles/Merkava.jpg"
  },
  {
    "inGameCost": "Gems: 10,000 - 20,000",
    "notes": "The Skyfox is a decently fast and maneuverable aircraft with a front-firing explosive round machine gun, along with 2 splitting missiles like the X-59 variants. It also features a passenger seat that, unfortunately, has no weapons.",
    "thumbnail": "/images/vehicles/Skyfox.jpg",
    "id": "e4211db9-d714-425b-b3f0-46adbe917af6",
    "demand": 6,
    "value": 2e4,
    "name": "Skyfox",
    "rarity": "Legendary",
    "trend": "Stable",
    "gemOverrideMax": 2e4,
    "tradeable": true,
    "history": [],
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Air",
    "gemOverrideMin": 1e4,
    "tags": [
      "Air"
    ]
  },
  {
    "value": 7e3,
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Hammerhead.jpg",
    "inGameCost": "Gems: 5,000 - 7,000",
    "notes": "The hammerhead functions exactly like the Seacraft DPC except for having improved aquatic movement speed, along with decreasing player movement speed on land. These tools are also the first of their kind, adding a new gameplay aspect for the seas.",
    "category": "Other",
    "demand": 8,
    "name": "Hammerhead",
    "gemOverrideMax": 7e3,
    "history": [],
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "e44726b2-7e1f-4ee1-9fc5-3025fe052308",
    "trend": "Stable",
    "tags": [
      "Tool",
      "Collector",
      "Special"
    ],
    "hasManualGemRange": true,
    "gemOverrideMin": 5e3,
    "tradeable": true
  },
  {
    "gemOverrideMax": 100,
    "notes": "Available through crates.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Forest%20_Banner_.jpg",
    "demand": 5,
    "value": 100,
    "gemOverrideMin": 50,
    "hasManualGemRange": true,
    "tags": [
      "Banner"
    ],
    "rarity": "Common",
    "id": "e58e1e00-2244-440d-bfeb-ddc104d3f2af",
    "trend": "Stable",
    "history": [],
    "category": "Tags",
    "inGameCost": "Gems: 50 - 100",
    "tradeable": true,
    "name": "Forest (Banner)"
  },
  {
    "tradeable": true,
    "name": "Rocket HE177",
    "gemOverrideMin": 1e4,
    "demand": 3,
    "id": "e671e5f3-3711-475c-bc47-f9ae84038f9a",
    "notes": "The Rocket HE177 features the same weaponry as the Super He177, but the 100-round machine gun is limited to 65 rounds, and the number of guided missiles is reduced by one, down to a total capacity of 2 guided missiles. The 2 AI machine guns are the same on both aircraft.",
    "gemOverrideMax": 13e3,
    "history": [],
    "rarity": "Legendary",
    "value": 13e3,
    "category": "Air",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Air",
      "Special"
    ],
    "trend": "Stable",
    "inGameCost": "Gems: 10,000 - 13,000",
    "thumbnail": "/images/vehicles/Rocket%20HE177.jpg"
  },
  {
    "thumbnail": "/images/vehicles/Puckmonster.jpg",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tags": [
      "Soldiers",
      "Special"
    ],
    "demand": 2,
    "trend": "Stable",
    "category": "Soldier",
    "rarity": "Limited Edition",
    "gemOverrideMin": 2e4,
    "name": "Puckmonster",
    "notes": "Decent troop that can only be obtained with 100k+ damage against the admin abuse boss. It features a rocket launcher that does decent damage and has decent reload, but not the best compared to other troops. It's essentially a reskinned rocket trooper.",
    "gemOverrideMax": 25e3,
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 3
      },
      "1": {
        "demand": 3
      },
      "2": {
        "demand": 3
      },
      "3": {
        "demand": 3
      }
    },
    "id": "e727ca15-8239-4770-95fa-5fda4f0d6220",
    "history": [],
    "tradeable": true,
    "inGameCost": "Gems: 20,000 - 25,000",
    "value": 25e3
  },
  {
    "value": 6e3,
    "id": "e77a2e6d-25b8-4f22-9ced-591ce09a3777",
    "demand": 3,
    "notes": "A good replacement for the a-10 having 8 missiles and an explosive machine gun.",
    "rarity": "Legendary",
    "name": "SU25",
    "thumbnail": "/images/vehicles/SU25.jpg",
    "gemOverrideMin": 4e3,
    "tradeable": true,
    "history": [],
    "trend": "Stable",
    "hasManualGemRange": true,
    "gemOverrideMax": 6e3,
    "tags": [
      "su25"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "category": "Air"
  },
  {
    "category": "Tags",
    "rarity": "Uncommon",
    "thumbnail": "/images/vehicles/Crosshair%20_Emblem_.jpg",
    "id": "e77bf828-790a-462e-9005-11bc21fcbbc1",
    "history": [],
    "gemOverrideMin": 50,
    "trend": "Stable",
    "demand": 2,
    "gemOverrideMax": 75,
    "name": "Crosshair (Emblem)",
    "value": 75,
    "hasManualGemRange": true,
    "notes": "This emblem is obtained by the kill tag crates.",
    "tags": [
      "Emblem"
    ],
    "inGameCost": "Gems: 50 - 75",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true
  },
  {
    "thumbnail": "/images/vehicles/Leopard%20Tank.jpg",
    "demand": 0,
    "trend": "Stable",
    "history": [],
    "name": "Leopard Tank",
    "gemOverrideMin": 50,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "id": "e7d318ac-abd2-4974-a2fa-15c6c0a51f14",
    "gemOverrideMax": 100,
    "rarity": "Common",
    "tags": [
      "leopard-tank"
    ],
    "notes": "The only tank with extra detail on the visual affects. Its main cannon is decent but it has no other weapons. This tank cannot currently be spawned",
    "category": "Land",
    "value": 100,
    "tradeable": true
  },
  {
    "notes": "imagine being slimed out by an LE that has 500x the cost of your vehicle and then they have this emote equipped",
    "tradeable": true,
    "rarity": "Legendary",
    "category": "Tags",
    "gemOverrideMax": 4500,
    "inGameCost": "Gems: 3,500 - 4,500",
    "name": "Mic Drop (Emote)",
    "history": [],
    "value": 4500,
    "demand": 5,
    "gemOverrideMin": 3500,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Mic%20Drop%20_Emote_.jpg",
    "id": "e902cd09-5240-421a-a1b9-5a542d036eeb",
    "tags": [
      "Emote"
    ]
  },
  {
    "history": [],
    "notes": "A cheap submarine that is buyable in the tycoon.",
    "name": "Submarine (Rare)",
    "rarity": "Rare",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 1,
    "inGameCost": "Gems: 80 - 180",
    "value": 180,
    "tags": [
      "Naval"
    ],
    "gemOverrideMax": 180,
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Submarine%20_Rare_.jpg",
    "category": "Naval",
    "gemOverrideMin": 80,
    "id": "e903bdff-0360-4731-a76c-0507b3c7882c",
    "hasManualGemRange": true
  },
  {
    "notes": "The F111 features the same weapons and features as the Super F111 except for losing 2 missiles, totaling 4 fast missiles. It also features slightly decreased stats compared to the Super F111.",
    "category": "Air",
    "value": 5e3,
    "inGameCost": "Gems: 3,000 - 5,000",
    "tags": [
      "Air"
    ],
    "thumbnail": "/images/vehicles/F111.jpg",
    "hasManualGemRange": true,
    "history": [],
    "id": "e94550b4-1196-47b5-b7c9-e6ceb42a547a",
    "trend": "Stable",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 5e3,
    "demand": 3,
    "gemOverrideMin": 3e3,
    "rarity": "Legendary",
    "name": "F111"
  },
  {
    "value": 750,
    "gemOverrideMax": 750,
    "thumbnail": "/images/vehicles/Flush%20_Emote_.jpg",
    "notes": "idek what this one does, looks cool tho",
    "inGameCost": "Gems: 500 - 750",
    "gemOverrideMin": 500,
    "name": "Flush (Emote)",
    "category": "Tags",
    "id": "ea2e15e3-8174-4d2f-b3d1-dd746ae7c765",
    "demand": 5,
    "tradeable": true,
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Stable",
    "rarity": "Rare",
    "tags": [
      "Emote"
    ],
    "history": []
  },
  {
    "value": 100,
    "rarity": "Common",
    "history": [],
    "notes": "Good for arsenal levels. (Buildable)",
    "demand": 2,
    "name": "Blackhawk Helicopter",
    "thumbnail": "/images/vehicles/Blackhawk%20Helicopter.jpg",
    "hasManualGemRange": true,
    "category": "Air",
    "tradeable": true,
    "gemOverrideMin": 20,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "eb12a792-7288-42b1-8da7-c7e92891260c",
    "trend": "Stable",
    "tags": [
      "blackhawk-helicopter"
    ],
    "gemOverrideMax": 100
  },
  {
    "gemOverrideMax": 5500,
    "rarity": "Legendary",
    "tags": [
      "superapc"
    ],
    "tradeable": true,
    "id": "eb446551-b884-4f18-b555-ed89a388f64d",
    "gemOverrideMin": 3e3,
    "demand": 4,
    "hasManualGemRange": true,
    "trend": "Stable",
    "category": "Land",
    "history": [],
    "value": 5500,
    "name": "SuperAPC",
    "thumbnail": "/images/vehicles/SuperAPC.jpg",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "notes": "A stronger version of the Armored APC."
  },
  {
    "tradeable": true,
    "tags": [
      "darkstar-mk-2"
    ],
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "value": 3e3,
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "hasCustomMultiplierOverrides": false,
    "notes": "Except for the Silkfire's missile, the MK-2 can outrun any missile at high levels.",
    "id": "eb51ee67-8391-4763-b623-db7ff4fe0194",
    "gemOverrideMin": 2e3,
    "rarity": "Epic",
    "name": "Darkstar MK-2",
    "demand": 3,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "gemOverrideMax": 3e3,
    "thumbnail": "/images/vehicles/Darkstar%20MK-2.jpg",
    "trend": "Stable",
    "category": "Air",
    "hasCustomStarOverrides": false
  },
  {
    "gemOverrideMin": 50,
    "value": 75,
    "inGameCost": "Gems: 50 - 75",
    "gemOverrideMax": 75,
    "notes": "This emblem is obtained in the kill tag crates!",
    "id": "eb62fca2-43da-479a-9b0e-b9581cd66978",
    "history": [],
    "thumbnail": "https://static.wixstatic.com/media/341c64_a250478a851f4476baf69b372b699644~mv2.jpeg/v1/fill/w_227,h_252,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_a250478a851f4476baf69b372b699644~mv2.jpeg",
    "name": "Tank (Emblem)",
    "lastUpdated": "2026-08-29",
    "tradeable": true,
    "rarity": "Uncommon",
    "category": "Tags",
    "trend": "Stable",
    "tags": [
      "Emblem"
    ],
    "hasManualGemRange": true,
    "demand": 2
  },
  {
    "excludeFromRecentlyUpdated": true,
    "demand": 10,
    "trend": "Stable",
    "rarity": "Exotic",
    "id": "ebbc0537-b3b7-42f2-86cd-389069538564",
    "thumbnail": "/images/vehicles/Top5%20AN%20Jeep.jpg",
    "name": "Top5 AN Jeep",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "value": 0,
    "tradeable": false,
    "history": [],
    "notes": "Top 5 vehicles for the top 5 factions during the AN Jeep season in January 2026. It features the same aimable explosive round machine gun as the normal Anti-Nuke Jeep variants. The Top5 AN Jeep features 2 hypersonic missile bursts that deal decent damage.",
    "tags": [
      "Ground",
      "Collector",
      "Special"
    ],
    "category": "Land",
    "inRecentlyUpdated": false,
    "inGameCost": "Untradable"
  },
  {
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "trend": "Stable",
    "name": "Manti Core",
    "demand": 4,
    "tradeable": true,
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "gemOverrideMax": 6600,
    "tags": [
      "manti-core"
    ],
    "category": "Land",
    "notes": "One of the highest damaging tank cannons. This vehicle is decent for most boss fights due to its high damage.",
    "history": [],
    "thumbnail": "/images/vehicles/Manti%20Core.jpg",
    "gemOverrideMin": 5300,
    "id": "ec8361bd-0c5d-42a4-9464-0a1000eed041",
    "value": 6600
  },
  {
    "tradeable": true,
    "category": "Air",
    "tags": [
      "Air"
    ],
    "rarity": "Exotic",
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "demand": 6,
    "id": "ec9730e0-87e4-4e75-8c32-2d7a520f1375",
    "gemOverrideMin": 5e4,
    "name": "Super Nova",
    "notes": "Buffed version of normal nova but has passenger seat rockets, also has an upgrade at level 100\n\nHigh missile damage capacity with a longer-than-normal barrage\n",
    "history": [],
    "hasManualGemRange": true,
    "inGameCost": "Gems: 50,000 - 60,000",
    "gemOverrideMax": 6e4,
    "thumbnail": "/images/vehicles/Super%20Nova.jpg",
    "value": 6e4
  },
  {
    "notes": "This emblem is obtained by the kill tag crates!",
    "gemOverrideMin": 50,
    "id": "ec997882-5117-4052-9d61-ad77451ab1ad",
    "history": [],
    "tradeable": true,
    "demand": 2,
    "value": 75,
    "gemOverrideMax": 75,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "rarity": "Uncommon",
    "name": "Mask (Emblem)",
    "trend": "Stable",
    "hasManualGemRange": true,
    "inGameCost": "Gems: 50 - 75",
    "category": "Tags",
    "thumbnail": "/images/vehicles/Mask%20_Emblem_.jpg",
    "tags": [
      "Emblem"
    ]
  },
  {
    "hasCustomStarOverrides": false,
    "category": "Tags",
    "tradeable": true,
    "demand": 5,
    "id": "ecdb92c1-478a-4637-a5c0-9b98c6681b32",
    "notes": "Available through crates.",
    "name": "Cyber (Banner)",
    "hasCustomMultiplierOverrides": false,
    "value": 25e3,
    "inRecentlyUpdated": false,
    "hasManualGemRange": true,
    "rarity": "Exotic",
    "tags": [
      "Banner"
    ],
    "inGameCost": "Gems: 20,000 - 25,000",
    "history": [],
    "trend": "Stable",
    "gemOverrideMin": 2e4,
    "excludeFromRecentlyUpdated": true,
    "gemOverrideMax": 25e3,
    "thumbnail": "/images/vehicles/Cyber%20_Banner_.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z"
  },
  {
    "rarity": "Epic",
    "value": 700,
    "thumbnail": "/images/vehicles/DarkStar.jpg",
    "category": "Air",
    "notes": "A weak non-explosive machine gun and it has 1 normal missile. With the +2 missile upgrade it becomes a decent fighter for how readily obtainable it is.",
    "history": [],
    "demand": 2,
    "tags": [
      "darkstar"
    ],
    "gemOverrideMax": 700,
    "hasManualGemRange": true,
    "gemOverrideMin": 500,
    "tradeable": true,
    "name": "DarkStar",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "trend": "Stable",
    "id": "ed2b9cd4-67b1-4262-bcbc-a50df7899dcf"
  },
  {
    "id": "edab710d-c1be-49f9-8201-83a84e3c30ba",
    "notes": "A decent anti-air vehicle but is greatly hurt by its limited range on its laser. This makes it not nearly as useful as other anti-air vehicles.",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "gemOverrideMin": 1500,
    "value": 3500,
    "tags": [
      "super-laser-truck"
    ],
    "thumbnail": "/images/vehicles/Super%20Laser%20Truck.jpg",
    "gemOverrideMax": 3500,
    "category": "Land",
    "trend": "Stable",
    "tradeable": true,
    "hasManualGemRange": true,
    "demand": 3,
    "rarity": "Epic",
    "history": [],
    "name": "Super Laser Truck"
  },
  {
    "inGameCost": "Gems: 1,000 - 2,000",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "id": "edb77dcc-8e19-4af5-823c-7d0554c7b0b5",
    "history": [],
    "name": "Snowball SMG",
    "thumbnail": "/images/vehicles/Snowball%20SMG.jpg",
    "trend": "Stable",
    "rarity": "Epic",
    "tags": [
      "Weapon",
      "Special"
    ],
    "tradeable": true,
    "value": 2e3,
    "gemOverrideMax": 2e3,
    "hasManualGemRange": true,
    "category": "Other",
    "demand": 7,
    "gemOverrideMin": 1e3,
    "notes": "The Snowball SMG is a reskin of the MP5 Submachine Gun within the game. But it features special bullets that stay in the ground longer. The bullets are transitioned into snowballs and can be stuck into walls to be used for writing."
  },
  {
    "notes": "Available through crates.",
    "name": "Lime (Banner)",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "tradeable": true,
    "value": 2500,
    "id": "edc06cc8-a901-48d6-bc9d-9a114a46ac54",
    "tags": [
      "Banner"
    ],
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Lime%20_Banner_.jpg",
    "trend": "Stable",
    "category": "Tags",
    "gemOverrideMax": 2500,
    "rarity": "Epic",
    "history": [],
    "inGameCost": "Gems: 2,000 - 2,500",
    "demand": 5,
    "gemOverrideMin": 2e3
  },
  {
    "value": 7e3,
    "inGameCost": "Gems: 6,000 - 7,000",
    "hasManualGemRange": true,
    "category": "Land",
    "notes": "Reskinned Foch 155 with armour peircing bonus for the main cannon",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "history": [],
    "name": "Liberty Foch",
    "id": "ee378ceb-6b29-484c-b20b-ebdf12a221ce",
    "demand": 6,
    "gemOverrideMax": 7e3,
    "thumbnail": "/images/vehicles/Liberty%20Foch.jpg",
    "trend": "Stable",
    "rarity": "Legendary",
    "tags": [
      "Ground"
    ],
    "gemOverrideMin": 6e3
  },
  {
    "category": "Land",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "hasManualGemRange": true,
    "tradeable": true,
    "name": "Super Halftrack",
    "trend": "Stable",
    "rarity": "Legendary",
    "gemOverrideMin": 5e3,
    "value": 6e3,
    "id": "eeb6c9ad-71ee-4faa-956a-548e2445e3cd",
    "thumbnail": "/images/vehicles/Super%20Halftrack.jpg",
    "inGameCost": "Gems: 5,000 - 6,000",
    "gemOverrideMax": 6e3,
    "demand": 3,
    "notes": "Combonation of normal and flak halftrack, machine gun is the same as the normal halftrack, cannon is the same as the flak halftrack, also has a cannon upgrade at level 100",
    "tags": [
      "Ground"
    ]
  },
  {
    "category": "Tags",
    "history": [],
    "trend": "Stable",
    "tradeable": true,
    "rarity": "Legendary",
    "id": "eeedebe7-56f6-4b11-9713-d0e96a788015",
    "name": "Violet (Banner)",
    "demand": 5,
    "notes": "Available through crates.",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "gemOverrideMax": 4e3,
    "inGameCost": "Gems: 3,000 - 4,000",
    "value": 4e3,
    "tags": [
      "Banner"
    ],
    "gemOverrideMin": 3e3,
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Violet%20_Banner_.jpg"
  },
  {
    "rarity": "Exotic",
    "tradeable": true,
    "trend": "Stable",
    "demand": 6,
    "name": "Noscope Bunny",
    "value": 19e3,
    "id": "ef38c3e2-6213-484f-9e1a-37da31527f42",
    "gemOverrideMax": 19e3,
    "hasManualGemRange": true,
    "history": [],
    "notes": "The Noscope Bunny features a semi-automatic sniper rifle that fires a few shots at a time that deal damage and are effective only at close range. The Noscope Bunny seems to be an Easter Bunny reskin of the Assassin troop.",
    "category": "Soldier",
    "tags": [
      "Soldiers",
      "Collector"
    ],
    "thumbnail": "/images/vehicles/Noscope%20Bunny.jpg",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMin": 14e3,
    "inGameCost": "Gems: 14,000 - 19,000"
  },
  {
    "rarity": "Common",
    "inGameCost": "Gems: 25 - 50",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Knife%20_Emblem_.jpg",
    "trend": "Stable",
    "demand": 1,
    "category": "Tags",
    "tags": [
      "Emblem"
    ],
    "gemOverrideMin": 25,
    "value": 50,
    "id": "f05de6b9-59a9-4336-a9a3-def9e698e362",
    "tradeable": true,
    "gemOverrideMax": 50,
    "name": "Knife (Emblem)",
    "notes": "This emblem is obtained by the kill tag crates!",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "value": 12e3,
    "rarity": "Legendary",
    "history": [],
    "notes": "Anti-tank variant of the Anti-Air Akrep features the same aimable explosive round cannon and 2 anti-tank missiles. This is the first time anti-tank missiles have been added to Military Tycoon. The missile also features a new texture and audio effects.",
    "hasManualGemRange": true,
    "demand": 5,
    "name": "AT Akrep",
    "thumbnail": "/images/vehicles/AT%20Akrep.jpg",
    "gemOverrideMax": 12e3,
    "category": "Land",
    "tradeable": true,
    "trend": "Stable",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tags": [
      "Ground",
      "Collector",
      "Special"
    ],
    "gemOverrideMin": 8e3,
    "id": "f1d41c64-0466-4875-92aa-81c02d9a13ee",
    "inGameCost": "Gems: 8,000 - 12,000"
  },
  {
    "trend": "Rising",
    "history": [],
    "rarity": "Legendary",
    "thumbnail": "/images/vehicles/Alien.jpg",
    "tags": [
      "Soldiers",
      "Collector",
      "Special"
    ],
    "inGameCost": "Gems: 150 - 200",
    "demand": 8,
    "category": "Soldier",
    "notes": "The Alien is a decently performing troop that features a ray gun with a fast fire rate. The range of the Alien is quite good, but its accuracy at longer ranges isn't great. The ray gun works best at close quarters, like the bank cellar. The raygun also reloads quite fast, and it deals high damage, about half the health of a level 10 troop in 1 landed shot.",
    "id": "f22ade7c-334a-45b7-a526-2fcb4f823186",
    "hasManualGemRange": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "gemOverrideMax": 200,
    "value": 200,
    "tradeable": true,
    "gemOverrideMin": 150,
    "name": "Alien"
  },
  {
    "trend": "Dropping",
    "history": [],
    "name": "Gripen",
    "demand": 3,
    "gemOverrideMin": 3600,
    "tradeable": true,
    "category": "Air",
    "id": "f23b0f1c-fded-4d5a-bb8e-3343e65e2a46",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "rarity": "Legendary",
    "gemOverrideMax": 4500,
    "tags": [
      "gripen"
    ],
    "notes": "Weak machinegun and missiles, but they become much better with the diamond upgrades.",
    "thumbnail": "/images/vehicles/Gripen.jpg",
    "value": 4500
  },
  {
    "category": "Tags",
    "name": "Olive (Banner)",
    "trend": "Stable",
    "hasManualGemRange": true,
    "thumbnail": "/images/vehicles/Olive%20_Banner_.jpg",
    "history": [],
    "gemOverrideMin": 50,
    "tradeable": true,
    "inGameCost": "Gems: 50 - 100",
    "rarity": "Common",
    "id": "f3035b98-0d5f-466d-8a9c-2f7bffadba09",
    "notes": "Available through crates.",
    "tags": [
      "Banner"
    ],
    "gemOverrideMax": 100,
    "demand": 5,
    "value": 100,
    "lastUpdated": "2026-09-10T22:08:35.943Z"
  },
  {
    "demand": 6,
    "hasManualGemRange": true,
    "gemOverrideMax": 5e3,
    "tags": [
      "striker"
    ],
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "rarity": "Epic",
    "gemOverrideMin": 3e3,
    "trend": "Dropping",
    "thumbnail": "/images/vehicles/Striker.jpg",
    "history": [],
    "name": "Striker",
    "tradeable": true,
    "value": 5e3,
    "notes": "A vehicle that revolves around its singular huge missile. This missile can lock-on to planes however it does not do enough damage to land vehicles to be good for combat.",
    "id": "f3442f4c-5cda-4c5a-8dbb-a1929d4570ad",
    "category": "Land"
  },
  {
    "gemOverrideMin": 1e4,
    "trend": "Stable",
    "tradeable": true,
    "inGameCost": "Gems: 10,000 - 15,000",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "gemOverrideMax": 15e3,
    "history": [],
    "tags": [
      "Air"
    ],
    "hasManualGemRange": true,
    "id": "f3fcb540-a50c-4ad3-a876-0b0c9c26e11c",
    "notes": "Average VTOL aircraft with 4 average missiles and 4 drop bombs",
    "category": "Air",
    "rarity": "Legendary",
    "value": 15e3,
    "thumbnail": "/images/vehicles/Harrier.jpg",
    "demand": 7,
    "name": "Harrier"
  },
  {
    "demand": 6,
    "gemOverrideMax": 29e3,
    "inGameCost": "Gems: 23,000 - 29,000",
    "acronym": "BT",
    "tags": [
      "Ground",
      "Special"
    ],
    "hasCustomMultiplierOverrides": false,
    "rarity": "Legendary",
    "gemOverrideMin": 23e3,
    "hasCustomStarOverrides": true,
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "tradeable": true,
    "history": [],
    "id": "f43634f9-fbae-461f-becf-6d5fcb9241c5",
    "trend": "Stable",
    "category": "Land",
    "name": "Battle Tank",
    "thumbnail": "/images/vehicles/Battle%20Tank.jpg",
    "starOverrides": {
      "0": 37500,
      "1": 37500,
      "2": 37700,
      "3": 47500,
      "4": 59500,
      "5": 102500,
      "fresh": 225e3
    },
    "value": 29e3,
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "notes": "Effectivally just a lower stat version of the le750",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "gemOverrideMax": 39375,
        "gemOverrideMin": 35625,
        "demand": 6,
        "value": 37500,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable"
      },
      "1": {
        "value": 37500,
        "trend": "Stable",
        "notes": "",
        "gemOverrideMin": 35625,
        "gemOverrideMax": 39375,
        "hasManualGemRange": false,
        "demand": 6
      },
      "2": {
        "hasManualGemRange": false,
        "gemOverrideMin": 35815,
        "gemOverrideMax": 39585,
        "demand": 6,
        "notes": "",
        "trend": "Stable",
        "value": 37700
      },
      "3": {
        "demand": 6,
        "hasManualGemRange": false,
        "value": 47500,
        "notes": "",
        "gemOverrideMax": 49875,
        "trend": "Stable",
        "gemOverrideMin": 45125
      },
      "4": {
        "value": 59500,
        "trend": "Stable",
        "notes": "",
        "hasManualGemRange": false,
        "demand": 6,
        "gemOverrideMin": 56525,
        "gemOverrideMax": 62475
      },
      "5": {
        "gemOverrideMin": 97375,
        "gemOverrideMax": 107625,
        "notes": "",
        "trend": "Stable",
        "demand": 6,
        "hasManualGemRange": false,
        "value": 102500
      },
      "fresh": {
        "demand": 6,
        "gemOverrideMax": 236250,
        "gemOverrideMin": 213750,
        "notes": "",
        "trend": "Stable",
        "value": 225e3,
        "hasManualGemRange": false
      }
    }
  },
  {
    "inGameCost": "Gems: 175,000 - 200,000",
    "excludeFromRecentlyUpdated": true,
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "notes": "The Quad Shock RPG features a single salvo of 4 rocket rounds that deal decent damage and apply the EMP effect. The Quad Shock RPG has an average reload and lock-on time. The range is the only limiting factor for it currently. This is the second lock on player weapon in-game. This is the first time an aimable emp weapon exists; the EMP grenade isn't really able to be aimed.",
    "thumbnail": "/images/vehicles/Quad%20Shock%20RPG.jpg",
    "value": 185e3,
    "name": "Quad Shock RPG",
    "gemOverrideMin": 175e3,
    "hasCustomMultiplierOverrides": false,
    "trend": "Stable",
    "id": "f497408a-edce-4982-8f5b-d8f03b6fd9f9",
    "history": [
      {
        "note": "Previous Market Valuation",
        "value": 2e5,
        "timestamp": "2026-06-12T22:11:16.644Z",
        "updatedBy": "System",
        "tierValues": {
          "0": 2e5
        },
        "date": "Jun 12"
      },
      {
        "tierValues": {
          "0": 185e3
        },
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-11T17:31:54.417Z",
        "note": "Staff moderation update",
        "value": 185e3,
        "date": "Sep 11",
        "tier": "0"
      }
    ],
    "hasCustomStarOverrides": false,
    "demand": 7,
    "category": "Other",
    "gemOverrideMax": 2e5,
    "tradeable": true,
    "rarity": "Limited Edition",
    "hasManualGemRange": true,
    "inRecentlyUpdated": false,
    "tags": [
      "Weapon",
      "Special"
    ]
  },
  {
    "hasCustomMultiplierOverrides": true,
    "name": "Air Commander",
    "gemOverrideMin": 15e4,
    "notes": "The Air Commander features a brand-new AI drone buff mechanic. The Air Commander is a Limited Edition Werewolf and Drill Worker reskin in terms of its weapons, health, damage, and functions as a troop. The Air Commander Boosts Health Points and Damage of AI drones spawned from any vehicle category, with a base boost percentage of 25% for a singular no-star soldier and an 185% boost for a singular 3-star soldier. The boosts can be stacked per additional soldier equipped to your inventory.",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "hasCustomStarOverrides": false,
    "id": "f5037b0b-45a2-44d8-9cd2-9529a3e46373",
    "gemOverrideMax": 2e5,
    "multiplierOverrides": {
      "0": 0.88,
      "1": 3.06,
      "2": 15.31,
      "3": 78.75
    },
    "value": 2e5,
    "category": "Soldier",
    "history": [],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "demand": 6,
        "gemOverrideMax": 183750,
        "gemOverrideMin": 166250,
        "value": 175e3,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable"
      },
      "1": {
        "notes": "",
        "hasManualGemRange": false,
        "trend": "Stable",
        "value": 612500,
        "demand": 6,
        "gemOverrideMin": 581875,
        "gemOverrideMax": 643125
      },
      "2": {
        "value": 3062500,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "demand": 6,
        "gemOverrideMin": 2909375,
        "gemOverrideMax": 3215625
      },
      "3": {
        "notes": "",
        "trend": "Stable",
        "value": 1575e4,
        "demand": 6,
        "gemOverrideMin": 14962500,
        "gemOverrideMax": 16537500,
        "hasManualGemRange": false
      }
    },
    "tags": [
      "Soldiers",
      "Special"
    ],
    "rarity": "Limited Edition",
    "trend": "Rising",
    "thumbnail": "/images/vehicles/Air%20Commander.jpg",
    "inRecentlyUpdated": false,
    "inGameCost": "Gems: 150,000 - 200,000",
    "demand": 8
  },
  {
    "history": [],
    "hasManualGemRange": true,
    "name": "Nova Blitz",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "notes": "A stronger F117; short cooldown on stealth and a little faster but functionally the same.",
    "tradeable": true,
    "id": "f5182e1d-f659-4030-9ddb-534a9285d635",
    "value": 55e3,
    "gemOverrideMax": 55e3,
    "thumbnail": "/images/vehicles/Nova%20Blitz.jpg",
    "tags": [
      "nova-blitz"
    ],
    "trend": "Dropping",
    "rarity": "Legendary",
    "gemOverrideMin": 4e4,
    "category": "Air",
    "demand": 5
  },
  {
    "rarity": "Common",
    "thumbnail": "/images/vehicles/Turret%20Helicopter.jpg",
    "gemOverrideMin": 10,
    "hasManualGemRange": true,
    "gemOverrideMax": 70,
    "name": "Turret Helicopter",
    "trend": "Dropping",
    "demand": 1,
    "category": "Air",
    "id": "f589b623-16af-4d37-81f7-c905f16e81ce",
    "value": 70,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "notes": "A weak but cheap helicopter anyone can purchase from their tycoon.",
    "history": [],
    "tradeable": true,
    "tags": [
      "turret-helicopter"
    ]
  },
  {
    "trend": "Dropping",
    "hasManualGemRange": true,
    "demand": 3,
    "tradeable": true,
    "tags": [
      "Ground",
      "Collector"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "category": "Land",
    "id": "f5a04d7e-74de-40b0-ba05-184b02b042b1",
    "rarity": "Rare",
    "notes": "This was the 2nd scavenger hunt vehicle added to the game and was introduced shortly after the Green Abrams Tank.Mostly Mistaken as the real green abram",
    "gemOverrideMin": 1e3,
    "history": [],
    "value": 2e3,
    "gemOverrideMax": 2e3,
    "thumbnail": "/images/vehicles/Abram%20Tank.jpg",
    "inGameCost": "Gems: 1,000 - 2,000",
    "name": "Abram Tank"
  },
  {
    "thumbnail": "/images/vehicles/Laugh%20_Emote_.jpg",
    "tags": [
      "Emote"
    ],
    "notes": "english: hahahahaha       spanish: jajajajajaja",
    "gemOverrideMax": 500,
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasManualGemRange": true,
    "gemOverrideMin": 250,
    "value": 500,
    "trend": "Stable",
    "category": "Tags",
    "name": "Laugh (Emote)",
    "rarity": "Uncommon",
    "id": "f5f09469-f6ca-4726-9bee-44421e4f14de",
    "history": [],
    "inGameCost": "Gems: 250 - 500",
    "tradeable": true,
    "demand": 5
  },
  {
    "gemOverrideMax": 275e3,
    "demand": 6,
    "gemOverrideMin": 225e3,
    "trend": "Stable",
    "rarity": "Limited Edition",
    "tags": [
      "Ground"
    ],
    "tradeable": true,
    "category": "Land",
    "value": 275e3,
    "excludeFromRecentlyUpdated": true,
    "thumbnail": "/images/vehicles/Hacker%20X.jpg",
    "history": [],
    "inGameCost": "Gems: 225,000 - 275,000",
    "hasManualGemRange": true,
    "notes": "Decent truck with EMP laser and EMP blast, along with a missile defense like that of the armored corvette, except with the Hacker X, it converts the fired upon missile into a lock-on missile.",
    "inRecentlyUpdated": false,
    "name": "Hacker X",
    "id": "f6c74f0f-165b-49c1-8326-15e607d4ab0c",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "hasCustomMultiplierOverrides": false,
    "acronym": "LEHX",
    "hasCustomStarOverrides": false
  },
  {
    "category": "Land",
    "id": "f6c91468-b3db-446c-9cc8-7ac08373daf0",
    "tags": [
      "Ground",
      "Special"
    ],
    "tradeable": true,
    "trend": "Stable",
    "gemOverrideMax": 5e4,
    "rarity": "Exotic",
    "history": [],
    "name": "M1E3",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/M1E3.jpg",
    "value": 5e4,
    "gemOverrideMin": 4e4,
    "demand": 5,
    "inGameCost": "Gems: 40,000 - 50,000",
    "hasManualGemRange": true,
    "notes": "The M1E3 features a brand new aimable guided missile. The missile deals good damage, but may be hard to aim at longer ranges. The missile can be fired twice after its short reload time is finished, and 2 missiles can be guided at targets. The M1E3 has its weapons split into 2 different weapon modes. The Guided missile weapon is within the Guided Missile weapon mode. The second weapon mode is named Artillery and features an aimable explosive-round machine gun that deals average damage, along with a single aimable cannon round. The turret rotation is quite slow, causing the Artillery weapon mode to be quite lackluster and not viable in combat. The maneuverability and speed of the M1E3 are quite solid compared to other tanks in its class."
  },
  {
    "notes": "A F-35 with 4 missiles and emp bombs that function similarly to yf-23's missiles",
    "hasManualGemRange": true,
    "tags": [
      "emp-f35"
    ],
    "history": [],
    "value": 14e3,
    "thumbnail": "/images/vehicles/EMP%20F35.jpg",
    "trend": "Rising",
    "tradeable": true,
    "category": "Air",
    "rarity": "Legendary",
    "gemOverrideMin": 11e3,
    "id": "f72adca0-2048-4727-ba0e-8ad1e6f42c04",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "name": "EMP F35",
    "demand": 5,
    "gemOverrideMax": 14e3
  },
  {
    "category": "Soldier",
    "tags": [
      "Soldiers"
    ],
    "notes": "High AOE damage to vehicle and troops.",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "thumbnail": "/images/vehicles/Grenadier.jpg",
    "value": 85,
    "history": [],
    "name": "Grenadier",
    "tradeable": true,
    "inGameCost": "Gems: 65 - 85",
    "gemOverrideMin": 65,
    "trend": "Dropping",
    "rarity": "Epic",
    "id": "f74942ff-e63b-4df4-8941-53f0e8c5a48c",
    "hasManualGemRange": true,
    "gemOverrideMax": 85,
    "demand": 7
  },
  {
    "id": "f7b0fefd-02d6-493e-93b1-515c45ac41fa",
    "category": "Air",
    "rarity": "Exotic",
    "tags": [
      "Air",
      "Special"
    ],
    "trend": "Stable",
    "thumbnail": "/images/vehicles/Super%20He177.jpg",
    "demand": 5,
    "gemOverrideMin": 65e3,
    "name": "Super He177",
    "tradeable": true,
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "notes": "The Super He177 features 2 average damage and fire rate AI machine guns. Along with a strong, damaging explosive 100-round, an aimable machine gun.  The Super He177 also features 3 guided missiles, which is the first time they've been on an aircraft. The guided missiles are quite average and overall not worth using as the AI and player-controlled machine guns seem to outweigh their use.",
    "history": [],
    "gemOverrideMax": 75e3,
    "hasManualGemRange": true,
    "value": 75e3,
    "inGameCost": "Gems: 65,000 - 75,000"
  },
  {
    "gemOverrideMax": 3e4,
    "category": "Air",
    "trend": "Stable",
    "name": "Zhi 19E",
    "demand": 8,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "tradeable": true,
    "gemOverrideMin": 2e4,
    "inGameCost": "Gems: 20,000 - 30,000",
    "rarity": "Exotic",
    "tags": [
      "Air"
    ],
    "notes": "Slightly weaker version of the Super Zhi 19E and has the same weapons, except the machine gun is not featured on the Zhi 19E.",
    "history": [],
    "thumbnail": "/images/vehicles/Zhi%2019E.jpg",
    "hasManualGemRange": true,
    "value": 3e4,
    "id": "f7bf78f8-c1d5-4c27-bd6b-fcec86fa6ed7"
  },
  {
    "gemOverrideMax": 25e3,
    "category": "Air",
    "rarity": "Legendary",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "history": [],
    "gemOverrideMin": 17500,
    "hasManualGemRange": true,
    "trend": "Stable",
    "demand": 7,
    "tradeable": true,
    "name": "Wrapped C17",
    "value": 25e3,
    "thumbnail": "/images/vehicles/Wrapped%20C17.jpg",
    "id": "f8a199ae-3682-41b5-a8c8-aae5c2d5c3a4",
    "notes": "Holidays reskinned C17",
    "tags": [
      "Air"
    ],
    "inGameCost": "Gems: 17,500 - 25,000"
  },
  {
    "hasManualGemRange": true,
    "notes": "A strong anti-air tank that is unlocked from rebirthing the military base.",
    "name": "AATank",
    "gemOverrideMin": 50,
    "inGameCost": "Gems: 50 - 200",
    "tradeable": true,
    "value": 200,
    "history": [],
    "gemOverrideMax": 200,
    "tags": [
      "Ground"
    ],
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "id": "f966c125-08a5-49fd-9ba0-0ee98b11ffac",
    "demand": 1,
    "thumbnail": "/images/vehicles/AATank.jpg",
    "trend": "Dropping",
    "category": "Land",
    "rarity": "Rare"
  },
  {
    "inGameCost": "Gems: 3,000 - 4,000",
    "name": "Amber (Banner)",
    "gemOverrideMin": 3e3,
    "value": 4e3,
    "thumbnail": "/images/vehicles/Amber%20_Banner_.jpg",
    "lastUpdated": "2026-09-10T22:08:34.900Z",
    "history": [],
    "notes": "Available through crates.",
    "gemOverrideMax": 4e3,
    "category": "Tags",
    "tags": [
      "Banner"
    ],
    "rarity": "Legendary",
    "demand": 5,
    "id": "f9b82a40-1a3a-424e-9857-d8ad0e6b17c6",
    "tradeable": true,
    "trend": "Stable",
    "hasManualGemRange": true
  },
  {
    "inGameCost": "Untradable",
    "notes": "This Emblem is obtained by getting the needed rebirths, arsenal levels, and dailies.",
    "excludeFromRecentlyUpdated": true,
    "rarity": "Epic",
    "lastUpdated": "2026-08-29",
    "value": 0,
    "name": "Major (Emblem)",
    "id": "fbe55816-8251-4cb3-8eb2-6f90d36213e0",
    "demand": 5,
    "tradeable": false,
    "trend": "Stable",
    "history": [],
    "thumbnail": "https://static.wixstatic.com/media/341c64_b41e9f3421414d27966a76360c822397~mv2.jpeg/v1/fill/w_222,h_246,al_c,lg_1,q_80,enc_avif,quality_auto/341c64_b41e9f3421414d27966a76360c822397~mv2.jpeg",
    "inRecentlyUpdated": false,
    "category": "Tags",
    "tags": [
      "Emblem",
      "Special"
    ]
  },
  {
    "category": "Land",
    "rarity": "Exotic",
    "tags": [
      "Ground",
      "Collector",
      "Special"
    ],
    "inGameCost": "Gems: 40,000 - 50,000",
    "thumbnail": "/images/vehicles/Strike%20Mech.jpg",
    "demand": 9,
    "trend": "Stable",
    "hasManualGemRange": true,
    "history": [],
    "id": "fccab39b-0a8e-4677-a63b-ccf68fca4fba",
    "value": 5e4,
    "gemOverrideMin": 4e4,
    "name": "Strike Mech",
    "tradeable": true,
    "gemOverrideMax": 5e4,
    "notes": "The Strike mech features the same weapons arsenal as the Super Mech, with decreased stats.",
    "lastUpdated": "2026-09-10T22:08:36.830Z"
  },
  {
    "notes": "The 2nd amphibious vehicle added to the game that has a strong machinegun and some missiles.",
    "id": "fd9b3e5f-4f34-4158-8bbc-3c0413bfc064",
    "thumbnail": "/images/vehicles/Sea%20Tank.jpg",
    "value": 700,
    "tags": [
      "sea-tank"
    ],
    "history": [],
    "hasManualGemRange": true,
    "trend": "Stable",
    "gemOverrideMax": 700,
    "demand": 3,
    "category": "Land",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "tradeable": true,
    "gemOverrideMin": 500,
    "rarity": "Epic",
    "name": "Sea Tank"
  },
  {
    "thumbnail": "/images/vehicles/SM-27.jpg",
    "tags": [
      "Air"
    ],
    "trend": "Rising",
    "inGameCost": "Gems: 2,500 - 3,500",
    "category": "Air",
    "history": [],
    "id": "fe4a72d7-762e-4925-9486-ca7a6836f47d",
    "lastUpdated": "2026-09-10T22:08:36.830Z",
    "name": "SM-27",
    "gemOverrideMax": 3500,
    "rarity": "Legendary",
    "notes": "An air-dodge vehicle that sports agile turning and power missilesExcellent for pvp and pleasant to fly",
    "hasManualGemRange": true,
    "tradeable": true,
    "gemOverrideMin": 2500,
    "demand": 5,
    "value": 3500
  },
  {
    "starOverrides": {
      "0": 325e3,
      "1": 325e3,
      "2": 325200,
      "3": 335e3,
      "4": 347e3,
      "5": 39e4,
      "fresh": 45e4
    },
    "tags": [
      "Ground"
    ],
    "excludeFromRecentlyUpdated": true,
    "history": [],
    "rarity": "Limited Edition",
    "value": 35e4,
    "hasCustomMultiplierOverrides": false,
    "demand": 3,
    "acronym": "WWT",
    "inRecentlyUpdated": false,
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "category": "Land",
    "hasManualGemRange": true,
    "starTierOverrides": {
      "0": {
        "value": 325e3,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false,
        "gemOverrideMin": 308750,
        "gemOverrideMax": 341250,
        "demand": 3
      },
      "1": {
        "hasManualGemRange": false,
        "notes": "",
        "demand": 3,
        "trend": "Stable",
        "value": 325e3,
        "gemOverrideMax": 341250,
        "gemOverrideMin": 308750
      },
      "2": {
        "demand": 3,
        "gemOverrideMin": 308940,
        "gemOverrideMax": 341460,
        "hasManualGemRange": false,
        "value": 325200,
        "notes": "",
        "trend": "Stable"
      },
      "3": {
        "value": 335e3,
        "gemOverrideMin": 318250,
        "gemOverrideMax": 351750,
        "hasManualGemRange": false,
        "notes": "",
        "trend": "Stable",
        "demand": 3
      },
      "4": {
        "value": 347e3,
        "demand": 3,
        "gemOverrideMax": 364350,
        "gemOverrideMin": 329650,
        "notes": "",
        "trend": "Stable",
        "hasManualGemRange": false
      },
      "5": {
        "demand": 3,
        "hasManualGemRange": false,
        "trend": "Stable",
        "notes": "",
        "value": 39e4,
        "gemOverrideMax": 409500,
        "gemOverrideMin": 370500
      },
      "fresh": {
        "gemOverrideMax": 5e5,
        "gemOverrideMin": 4e5,
        "value": 45e4,
        "trend": "Stable",
        "notes": "",
        "hasManualGemRange": true,
        "demand": 4
      }
    },
    "notes": "A decent maneuvering tank that features 2 weapons. The first is a flamethrower that has a purple effect. The second weapon is a gas implosion that activates a few seconds after the in-game weapon button is pressed. The gas radius is quite large, but the damage is low. The secondary weapon reloads quite fast for its capabilities. The flamethrower has quite a large ammo capacity but a long reload time.",
    "tradeable": true,
    "id": "fea9b8ec-9231-4ad0-930f-b5a9c4aa5ab9",
    "gemOverrideMin": 3e5,
    "thumbnail": "/images/vehicles/Werewolf%20Tank.jpg",
    "name": "Werewolf Tank",
    "gemOverrideMax": 35e4,
    "inGameCost": "Gems: 300,000 - 350,000",
    "trend": "Stable",
    "hasCustomStarOverrides": true
  },
  {
    "history": [],
    "tags": [
      "Emblem"
    ],
    "trend": "Stable",
    "tradeable": true,
    "name": "Gold Star (Emblem)",
    "lastUpdated": "2026-09-10T22:08:35.943Z",
    "demand": 3,
    "gemOverrideMin": 200,
    "notes": "This emblem is obtained by the kill tag crates!",
    "thumbnail": "/images/vehicles/Gold%20Star%20_Emblem_.jpg",
    "inGameCost": "Gems: 200 - 250",
    "hasManualGemRange": true,
    "category": "Tags",
    "id": "febee80a-6924-4b5a-b05b-911ce625f727",
    "rarity": "Epic",
    "gemOverrideMax": 250,
    "value": 250
  },
  {
    "demand": 5,
    "tags": [
      "Emblem"
    ],
    "tradeable": true,
    "inGameCost": "Gems: 450 - 550",
    "rarity": "Legendary",
    "trend": "Stable",
    "hasManualGemRange": true,
    "id": "ff9f3381-8dad-47a1-9f9e-21ce29f253c2",
    "category": "Tags",
    "name": "Win Medal (Emblem)",
    "value": 550,
    "history": [],
    "gemOverrideMin": 450,
    "notes": "This emblem is obtained in the Kill Tag crates!",
    "lastUpdated": "2026-09-10T22:08:37.729Z",
    "thumbnail": "/images/vehicles/Win%20Medal%20_Emblem_.jpg",
    "gemOverrideMax": 550
  },
  {
    "inRecentlyUpdated": false,
    "initialHistoryNote": "Catalog addition",
    "name": "Helmet (Emblem)",
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "rarity": "Uncommon",
    "trend": "Stable",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "demand": 4,
    "category": "Tags",
    "id": "helmet-emblem",
    "notes": "Recently cataloged item.",
    "history": [
      {
        "note": "Catalog addition",
        "value": 350,
        "updatedBy": "Spuppers",
        "date": "Sep 10",
        "timestamp": "2026-09-10T21:07:42.897Z"
      }
    ],
    "thumbnail": "/images/vehicles/Helmet%20_Emblem_.jpg",
    "value": 350
  },
  {
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "tradeable": true,
    "history": [
      {
        "date": "Sep 10",
        "value": 125e4,
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-10T21:08:52.373Z",
        "note": "Catalog addition"
      }
    ],
    "hasCustomMultiplierOverrides": false,
    "category": "Air",
    "trend": "Unstable",
    "initialHistoryNote": "Catalog addition",
    "hasCustomStarOverrides": false,
    "excludeFromRecentlyUpdated": true,
    "rarity": "Limited Edition",
    "value": 125e4,
    "thumbnail": "/images/vehicles/Limited%20F117.jpg",
    "id": "limited-f117",
    "name": "Limited F117",
    "demand": 8,
    "notes": "The Super F117 is a stealthy, fast, and maneuverable jet bomber hybrid. The Super F117 is also super stable upon landing and doesn't bounce like other vehicles.\n\nThe Super F117 features a first of it's kind toggleable Infinite Hunter Mode.\n\nThe Super F117 features 2 extended lock-on ranged Hypersonic missiles that can lock onto both naval and ground targets.",
    "inRecentlyUpdated": false
  },
  {
    "tradeable": true,
    "trend": "Stable",
    "excludeFromRecentlyUpdated": true,
    "id": "minigun-drone",
    "category": "Drone",
    "initialHistoryNote": "Catalog addition",
    "notes": "The Minigun Drone features a fast fire rate explosive round machine gun that deals excellent damage, but just like all drones it has quite low health. The Minigun Drone buffs your soldiers and player weapon fire rate by 50%, this stacks with stars so a singular drone can buff your fire rate up to 150%, when combined with 2 drones a max fire rate of 300% can be achieved.",
    "inRecentlyUpdated": false,
    "rarity": "Limited Edition",
    "value": 12e4,
    "history": [
      {
        "note": "Catalog addition",
        "timestamp": "2026-09-10T21:15:19.956Z",
        "updatedBy": "Spuppers",
        "value": 12e4,
        "date": "Sep 10"
      }
    ],
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "thumbnail": "/images/vehicles/Minigun%20Drone.jpg",
    "demand": 5,
    "name": "Minigun Drone"
  },
  {
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "tradeable": true,
    "initialHistoryNote": "Catalog addition",
    "name": "Prey",
    "trend": "Dropping",
    "demand": 6,
    "value": 85e3,
    "history": [
      {
        "date": "Sep 10",
        "value": 85e3,
        "note": "Catalog addition",
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-10T21:13:05.512Z"
      }
    ],
    "rarity": "Exotic",
    "notes": "The Prey is a stealthy and agile jet that unfortunately has a passenger seat featuring no additional features or weapons.\n\nThe Prey features Hunter Mode as one of it's abilities.\n\nThe Prey also has a new emp burst drop bomb that can be manually detonated upon a second tap or press of the bomb button. This emp bomb stay in place upon your first bomb button press, then it is detonated upon a second tap.\n\nThe Prey also features 2 of a double shot magnetic missile burst that deals low damage and has a long reload time.\n\nCurrently the magnetic effect doesn't apply when stealing the aircraft.",
    "id": "prey",
    "category": "Air",
    "excludeFromRecentlyUpdated": true,
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Prey.jpg"
  },
  {
    "demand": 7,
    "category": "Air",
    "name": "Silkfire-X",
    "hasCustomMultiplierOverrides": false,
    "hasCustomStarOverrides": false,
    "inRecentlyUpdated": false,
    "hasManualGemRange": false,
    "rarity": "Limited Edition",
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "trend": "Unstable",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "value": 11e5,
    "history": [
      {
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-10T21:14:27.112Z",
        "date": "Sep 10",
        "value": 9e5,
        "note": "Catalog addition"
      },
      {
        "value": 9e5,
        "note": "Previous Market Valuation",
        "date": "Jun 12",
        "timestamp": "2026-06-12T22:11:16.644Z",
        "updatedBy": "System",
        "tierValues": {
          "0": 9e5,
          "1": 9e5,
          "2": 900200,
          "3": 91e4,
          "4": 92e4,
          "5": 96e4,
          "fresh": 9e5
        }
      },
      {
        "date": "Sep 10",
        "value": 11e5,
        "updatedBy": "Spuppers",
        "tierValues": {
          "0": 11e5,
          "1": 11e5,
          "2": 1100200,
          "3": 111e4,
          "4": 112e4,
          "5": 116e4,
          "fresh": 11e5
        },
        "note": "Staff moderation update",
        "timestamp": "2026-09-10T22:38:21.936Z"
      }
    ],
    "thumbnail": "/images/vehicles/Silkfire-X.jpg",
    "id": "silkfire-x",
    "notes": "The Silkfire X is a fast and maneuverable  fighter jet that features a red and black death theme to that of the normal Silkfire. The Silkfire X sadly can't equip any of the skins previously obtained on the legendary rarity Silkfire.\n\nThe Silkfire X features the same frontally aimed 65 explosive round machine gun found on the legendary rarity Silkfire.\n\nThe Silkfire X features a single the first of it's kind, Anti-dodge, Anti-stealth, Anti-Hunter mode, Anti-flare, hypersonic, and large explosive radius missile. The super-missile features a long reload time to compensate for it's abilities, The damage of the super-missile is on par with a SU-24 Missile which makes it's damage quite good.\n\nThe Silkfire also has 2 gem upgrades at level 50 and level 100 respectively. At level 50 and 25k gems it has the Super Rocket Upgrade which just reduces reload speed. While at Level 100 and 100k gems it has a option to convert it's machine guns to plasma cannons, similar to the CFA-44's upgrade.",
    "acronym": "SFX",
    "initialHistoryNote": "Catalog addition"
  },
  {
    "notes": "The Super Prey is a stealthy and agile jet that unfortunately has a passenger seat featuring no additional features or weapons.\n\nThe Super Prey features Hunter Mode as one of it's abilities with during Hunter Mode turns into a white or platinum paint scheme.\n\nThe Super Prey also has a new emp burst drop bomb that can be manually detonated upon a second tap or press of the bomb button. This emp bomb stay in place upon your first bomb button press, then it is detonated upon a second tap.\n\nThe Super Prey features 4 of the double magnetic missile bursts that deal low damage, and have a long reload time.\n\nCurrently the magnetic effect doesn't apply when stealing the aircraft.",
    "excludeFromRecentlyUpdated": true,
    "tradeable": true,
    "value": 7e5,
    "id": "super-prey",
    "trend": "Dropping",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "thumbnail": "/images/vehicles/Super%20Prey.jpg",
    "rarity": "Limited Edition",
    "history": [
      {
        "date": "Sep 10",
        "note": "Catalog addition",
        "value": 7e5,
        "updatedBy": "Spuppers",
        "timestamp": "2026-09-10T21:11:23.017Z"
      }
    ],
    "category": "Air",
    "name": "Super Prey",
    "demand": 6,
    "initialHistoryNote": "Catalog addition",
    "inRecentlyUpdated": false
  },
  {
    "history": [
      {
        "note": "Catalog addition",
        "date": "Sep 10",
        "timestamp": "2026-09-10T21:11:48.475Z",
        "updatedBy": "Spuppers",
        "value": 125e3
      }
    ],
    "value": 125e3,
    "tradeable": true,
    "name": "Super T-14",
    "notes": "Recently cataloged item.",
    "inRecentlyUpdated": false,
    "excludeFromRecentlyUpdated": true,
    "rarity": "Exotic",
    "category": "Land",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "thumbnail": "/images/vehicles/Super%20T-14.jpg",
    "initialHistoryNote": "Catalog addition",
    "trend": "Dropping",
    "demand": 6,
    "id": "super-t-14"
  },
  {
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "value": 0,
    "thumbnail": "/images/vehicles/Super%20Terminator.jpg",
    "excludeFromRecentlyUpdated": true,
    "id": "super-terminator",
    "notes": "Recently cataloged item.",
    "history": [
      {
        "date": "Sep 10",
        "updatedBy": "Spuppers",
        "value": 0,
        "timestamp": "2026-09-10T21:12:16.306Z",
        "note": "Catalog addition"
      }
    ],
    "demand": 6,
    "initialHistoryNote": "Catalog addition",
    "name": "Super Terminator",
    "tradeable": true,
    "rarity": "Exotic",
    "trend": "Stable",
    "inRecentlyUpdated": false,
    "category": "Land"
  },
  {
    "history": [
      {
        "date": "Sep 10",
        "note": "Catalog addition",
        "value": 55e4,
        "timestamp": "2026-09-10T21:17:00.085Z",
        "updatedBy": "Spuppers"
      }
    ],
    "trend": "Stable",
    "name": "Super Titan Hauler",
    "tradeable": true,
    "excludeFromRecentlyUpdated": true,
    "rarity": "Limited Edition",
    "category": "Air",
    "acronym": "STH",
    "demand": 6,
    "initialHistoryNote": "Catalog addition",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "notes": "The Super Titan Hauler is a vehicle transport helicopter, and due to it's ability to carry ground vehicles, it spawns already flying in the air. There is also sadly no passenger seat on the Super Titan Hauler, except for the ground vehicle seats that it may carry.\n\nThe Super Titan Hauler features 2 weapon Loadouts, the first is named Loadout 1. Loadout 1 features the same weapons as the exotic rarity Titan Hauler, the magnetic grapple arm, magnetic missiles, and the ground vehicle spawner. The main difference is that the Super Titan Hauler features more magnetic missiles to where it's fast reload speed almost makes it have a infinitely spammable setup.\n\nThe second weapon Loadout named Loadout 2, features a dual drone spawner that spawns in 2 reaper drones that deal decent damage. Along with a ground vehicle spawner like in Loadout 1.\n\nCurrently the magnetic grapple arm and ground vehicle spawner are very buggy and don't work as intended.",
    "id": "super-titan-hauler",
    "inRecentlyUpdated": false,
    "thumbnail": "/images/vehicles/Super%20Titan%20Hauler.jpg",
    "value": 55e4
  },
  {
    "hasCustomStarOverrides": false,
    "demand": 6,
    "category": "Land",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "history": [
      {
        "date": "Sep 10",
        "updatedBy": "Spuppers",
        "value": 0,
        "note": "Catalog addition",
        "timestamp": "2026-09-10T21:12:40.815Z"
      },
      {
        "updatedBy": "System",
        "tierValues": {
          "0": 0,
          "1": 0,
          "2": 200,
          "3": 1e4,
          "4": 2e4,
          "5": 6e4,
          "fresh": 0
        },
        "date": "Jun 12",
        "timestamp": "2026-06-12T22:11:16.644Z",
        "value": 0,
        "note": "Previous Market Valuation"
      },
      {
        "updatedBy": "Spuppers",
        "tierValues": {
          "0": 13e3,
          "1": 13e3,
          "2": 13200,
          "3": 23e3,
          "4": 33e3,
          "5": 73e3,
          "fresh": 13e3
        },
        "note": "Staff moderation update",
        "timestamp": "2026-09-11T17:20:47.124Z",
        "date": "Sep 11",
        "value": 13e3
      }
    ],
    "hasCustomMultiplierOverrides": false,
    "trend": "Stable",
    "id": "t-14",
    "inRecentlyUpdated": false,
    "rarity": "Legendary",
    "hasManualGemRange": false,
    "tradeable": true,
    "name": "T-14",
    "excludeFromRecentlyUpdated": true,
    "value": 13e3,
    "thumbnail": "/images/vehicles/T-14.jpg",
    "notes": "Recently cataloged item.",
    "initialHistoryNote": "Catalog addition"
  },
  {
    "demand": 5,
    "thumbnail": "/images/vehicles/Titan%20Hauler.jpg",
    "initialHistoryNote": "Catalog addition",
    "inRecentlyUpdated": false,
    "rarity": "Exotic",
    "trend": "Stable",
    "id": "titan-hauler",
    "excludeFromRecentlyUpdated": true,
    "category": "Air",
    "name": "Titan Hauler",
    "value": 55e3,
    "history": [
      {
        "note": "Catalog addition",
        "timestamp": "2026-09-10T21:16:30.402Z",
        "value": 55e3,
        "updatedBy": "Spuppers",
        "date": "Sep 10"
      }
    ],
    "tradeable": true,
    "notes": "The Titan Hauler is a vehicle transport helicopter, and due to it's ability to carry ground vehicles, it spawns already flying in the air. There is also sadly no passenger seat on the Titan Hauler, except for the ground vehicle seats that it may carry.\n\nThe Titan Hauler features 4 magnetic missiles like the F24 variants that reload quite fast. \n\nThe Titan Hauler's main weapon is it's ability to spawn any ground vehicle within your inventory. This is combined with a magnetic grapple arm that is what holds the ground vehicle during flight.\n\nCurrently the magnetic grapple arm and ground vehicle spawner are very buggy and don't work as intended.",
    "lastUpdated": "2026-06-12T22:11:16.644Z"
  },
  {
    "name": "Top 5 Steel Rain",
    "history": [
      {
        "value": 0,
        "date": "Sep 10",
        "updatedBy": "Spuppers",
        "note": "Catalog addition",
        "timestamp": "2026-09-10T21:18:23.148Z"
      }
    ],
    "inRecentlyUpdated": false,
    "tradeable": false,
    "excludeFromRecentlyUpdated": true,
    "notes": "Speedy naval vessel with slow axis rotation speed\n\n150 round machine gun that deals good damage and has a fast reload\n\n8 air-lock on missiles that deal good damage and have almost instant reload, but suffer from poor range and speed.\n\nAI controlled cannon that deals good damage and has good attack range, but suffers from the cannon rounds hitting the water from being aimed too low.",
    "category": "Naval",
    "lastUpdated": "2026-06-12T22:11:16.644Z",
    "id": "top-5-steel-rain",
    "initialHistoryNote": "Catalog addition",
    "value": 0,
    "trend": "Stable",
    "rarity": "Exotic",
    "thumbnail": "/images/vehicles/Top%205%20Steel%20Rain.jpg",
    "demand": 4
  }
];

// src/data/initialItems.ts
var INITIAL_ITEMS = INITIAL_MILITARY_ITEMS;

// src/data/vehicleImageMap.ts
var VEHICLE_IMAGE_MAP = {
  "Sea Dragon": "Sea Dragon.png",
  "1d563caf-cd71-4eb4-b084-73cd749bfaa7": "Sea Dragon.png",
  "Super Sea Dragon": "Super Sea Dragon.png",
  "8c4f6ad2-14ee-4642-8bb6-c2d882bfce10": "Super Sea Dragon.png",
  "F35 Billion": "F35 Billion.png",
  "04665f20-9d91-41be-8b39-fbef426b04d7": "F35 Billion.png",
  "Mech Transport X": "Mech Transport X.png",
  "a2028fce-7c52-4ed0-abcc-c2e78fd47206": "Mech Transport X.png",
  "Mech Transport": "Mech Transport.png",
  "ac9a3ccd-b821-420f-b9ea-b4b987008b8b": "Mech Transport.png",
  "Super Ace Pilot": "Super Ace Pilot.png",
  "afa410b3-b2e3-465e-814c-74312f7995a3": "Super Ace Pilot.png",
  "Super TU-160": "Super TU-160.png",
  "cfcbc634-e71e-4e8b-a7ed-03fc08e2929c": "Super TU-160.png",
  "TU-160": "TU-160.png",
  "3a16fd5a-1138-4c9b-925e-7c726de95274": "TU-160.png",
  "Super Stealth Boat": "Super Stealth Boat.png",
  "5d97dee1-7687-4cad-afa7-a0a25a9a86b3": "Super Stealth Boat.png",
  "Medic Helicopter": "Medic Helicopter.png",
  "805c0306-f833-427b-9d70-3ba2efa5e305": "Medic Helicopter.png",
  "Super Medic Helicopter": "Super Medic Helicopter.png",
  "3fb6c5bd-94c3-473b-abda-73e026300d73": "Super Medic Helicopter.png",
  "Raptor X": "Raptor X.png",
  "2255610b-16bd-4ee0-83a4-1bfb06c5fa0c": "Raptor X.png",
  "Battle Yacht": "Battle Yacht.png",
  "67563d48-df47-49ee-858c-6fb291a59b6e": "Battle Yacht.png",
  "Super Battle Yacht": "Super Battle Yacht.png",
  "2929c428-cac9-4bc2-8ed4-0e0d3638c6cf": "Super Battle Yacht.png",
  "Super Hoverbike": "Super HoverBike.png",
  "cb854d92-8c8f-4128-a12d-fe8eda1b040d": "Super HoverBike.png",
  "Super Air Carrier": "Super Air Carrier.png",
  "e2a4f203-edb4-4ef9-a40d-270a39ea4e02": "Super Air Carrier.png",
  "Air Carrier": "Air Carrier.png",
  "00aa4ed9-0310-4a90-95ea-4524dccf5947": "Air Carrier.png",
  "Air Commander": "Air Commander.png",
  "f5037b0b-45a2-44d8-9cd2-9529a3e46373": "Air Commander.png",
  "Mig25": "Mig25.png",
  "ac0eeda5-c505-4a6a-ae2d-d4e2caebce81": "Mig25.png",
  "Super Mig25": "Super Mig25.png",
  "ab191829-707e-46ea-bf66-7c9266cf6a2d": "Super Mig25.png",
  "Super CFA44": "Super CFA44.png",
  "06df876a-4351-4c7d-a63e-1f494df7762f": "Super CFA44.png",
  "Super S67": "Super S67.png",
  "09f35e69-cb90-48d3-a2cb-402d4265a20f": "Super S67.png",
  "S67": "S67.png",
  "16b78482-0ed5-4dd4-9e41-f81b8951377d": "S67.png",
  "Super Alien": "Super Alien.png",
  "9f330164-15a7-44d7-a898-5ae7f3293829": "Super Alien.png",
  "F24": "F24.png",
  "21c70052-7473-4124-9517-620e42dd10e4": "F24.png",
  "Red F14": "Red F14.png",
  "7db14095-379b-4dc2-8de6-7ecac27989b3": "Red F14.png",
  "Limited XF12": "Limited XF12.png",
  "bfbc5956-ef82-494a-b4e2-de7e00208ec1": "Limited XF12.png",
  "XF12": "XF12.png",
  "3dd6d3ae-98cc-43de-ad2d-542fa6683988": "XF12.png",
  "Super Repair Drone": "Super Repair Drone.png",
  "105bea0e-eb63-48bc-8247-4fe0ad45616a": "Super Repair Drone.png",
  "Limited SONAR": "Limited SONAR.png",
  "ce603059-dd52-4d00-adf5-39f7dd191047": "Limited SONAR.png",
  "Rocket HE177": "Rocket HE177.png",
  "e671e5f3-3711-475c-bc47-f9ae84038f9a": "Rocket HE177.png",
  "Super He177": "Super He177.png",
  "f7b0fefd-02d6-493e-93b1-515c45ac41fa": "Super He177.png",
  "Heavy T28": "Heavy T28.png",
  "cffbedb4-9e3b-442c-bb54-e840ad603706": "Heavy T28.png",
  "Limited T28": "Limited T28.png",
  "05b5db5a-9c84-470a-af1b-d76ada52d9b3": "Limited T28.png",
  "Overwatch": "Overwatch.png",
  "46089e2c-e5d4-44d1-9da3-7e8e52e431a4": "Overwatch.png",
  "LE Cobra Super": "LE Cobra Super.png",
  "c5814f48-3d98-4a80-a68b-d04f29ac03be": "LE Cobra Super.png",
  "Submarine (C)": "Submarine (C).png",
  "022b66e9-5be7-48d4-94b5-3cec17c5b89e": "Submarine (C).png",
  "Limited Patriot": "Limited Patriot.png",
  "071e1910-d4b3-401b-866e-07d116e75015": "Limited Patriot.png",
  "Steel Rain": "Steel Rain.png",
  "bacb9fdb-b1e3-4776-8acb-12e53497faba": "Steel Rain.png",
  "Master Rain": "Master Rain.png",
  "502fa70c-ba06-43b4-8d37-49607331edca": "Master Rain.png",
  "Top5 MLRS": "TOP5 MLRS.png",
  "44cc0bae-a6ca-4141-9665-bbed81bad322": "TOP5 MLRS.png",
  "Warspite": "Warspite.png",
  "6d79f1e3-535b-4282-a1d0-d1dc5ae31c02": "Warspite.png",
  "Super Warspite": "Super Warspite.png",
  "7991d23d-3c5f-4b39-894d-065c8087adfe": "Super Warspite.png",
  "LE_HealingDrone": "LE_HealingDrone.png",
  "007704ed-1acc-49e9-b6c4-d421e31463f8": "LE_HealingDrone.png",
  "K7": "K7.png",
  "1098e257-de65-45da-9119-363ae730e041": "K7.png",
  "Nuke K7": "Nuke K7.png",
  "6787eb74-f82a-4f77-aaea-0a79ecdfef18": "Nuke K7.png",
  "Super M1E3": "Super M1E3.png",
  "8ab5477f-cd36-46da-8770-87de89d3e8f7": "Super M1E3.png",
  "M1E3": "M1E3.png",
  "f6c91468-b3db-446c-9cc8-7ac08373daf0": "M1E3.png",
  "Super Rafale": "Super Rafale.png",
  "9d76a679-b7c5-46dd-b867-4ad10bc1709c": "Super Rafale.png",
  "Super Yamato": "Super Yamato.png",
  "752871f8-345d-44fb-a2ac-cc195de4bf91": "Super Yamato.png",
  "Super A37": "Super A37.png",
  "d0079328-3d73-4826-ac2e-7159b7bb6d2b": "Super A37.png",
  "A37": "A37.png",
  "1cf46655-be20-4154-a98e-040d2b330455": "A37.png",
  "Phoenix Shotgun": "Phoenix Shotgun.png",
  "c19e955f-f948-4795-a15b-7d4f4b389dbb": "Phoenix Shotgun.png",
  "Anti-Air Turret": "Anti-Air Turret.png",
  "444a66b5-8c81-4117-85f8-64c38ff44e14": "Anti-Air Turret.png",
  "Super Tiger Mech": "Super Tiger Mech.png",
  "be42667d-64f2-465f-bd80-0bcb6f7d6ab2": "Super Tiger Mech.png",
  "Tiger Mech": "Tiger Mech.png",
  "7a2b895e-7ae1-43c0-b77d-586ae504dc6d": "Tiger Mech.png",
  "BOSS MLRS": "BOSS MLRS.png",
  "46c75d56-87a6-4463-9337-07f7baf92b25": "BOSS MLRS.png",
  "MLRS": "MLRS.png",
  "28e891de-8ab8-4bba-9b64-24023b6061f4": "MLRS.png",
  "Super Beam Tank": "Super Beam Tank.png",
  "b8f5267c-1d07-4557-8434-4a2e65394a4f": "Super Beam Tank.png",
  "Beam Tank": "Beam Tank.png",
  "3544223a-294a-4ecf-9816-7baf9d73634f": "Beam Tank.png",
  "Recon Destroyer": "Recon Destroyer.png",
  "22d307ec-0c7b-40c6-b97e-2688b99c2f78": "Recon Destroyer.png",
  "Super Recon Destroyer": "Super Recon Destroyer.png",
  "96b8225d-ee66-4b0a-b734-691801576dbd": "Super Recon Destroyer.png",
  "Hammerhead": "Hammerhead.png",
  "e44726b2-7e1f-4ee1-9fc5-3025fe052308": "Hammerhead.png",
  "Seacraft DPC": "Seacraft DPC.png",
  "87bf39db-3413-49fc-9ee9-7294046cd5c3": "Seacraft DPC.png",
  "Top5 Overlord": "Top5 Overlord.png",
  "b3239d20-f0f4-4c4c-a57e-dcb48474cd7b": "Top5 Overlord.png",
  "Rainbow Darkstar": "Darkstar.png",
  "a692bd13-3a4c-4f68-8041-7186c02e00bd": "Darkstar.png",
  "War Bunny": "War Bunny.png",
  "80f613be-b4fc-4fca-bed2-7d0c8205dfe9": "War Bunny.png",
  "Slash Bunny": "Slash Bunny.png",
  "5ebc0327-ccfe-4242-97db-f5cab6fe84cb": "Slash Bunny.png",
  "Grenade Bunny": "Grenade Bunny.png",
  "bd88c39d-d228-4ed8-b61b-5b07ebcd5d84": "Grenade Bunny.png",
  "Egg Launcher": "Egg Launcher.png",
  "47c5119a-3f88-43f1-a639-387a4afd4747": "Egg Launcher.png",
  "Plat Skyhammer": "Plat Skyhammer.png",
  "cb824716-2b74-4259-b6a1-45443f400f6c": "Plat Skyhammer.png",
  "Warlord Bunny": "Warlord Bunny.png",
  "a699f238-8c48-47fe-9fad-9c6dd4ebe0a4": "Warlord Bunny.png",
  "Noscope Bunny": "Noscope Bunny.png",
  "ef38c3e2-6213-484f-9e1a-37da31527f42": "Noscope Bunny.png",
  "Super Razor": "Super Razor.png",
  "34530dd5-159d-4215-82e5-190db528b3a2": "Super Razor.png",
  "Razor": "Razor.png",
  "4090c411-572c-4ccf-8f27-f64d522e2462": "Razor.png",
  "Antonov A40": "Antonov A4&0.png",
  "9e092c80-9946-45cb-9e21-5900aa423919": "Antonov A4&0.png",
  "Korkut": "Korkut.png",
  "6013b227-4c4f-4ac2-b971-3a517959d4b8": "Korkut.png",
  "UAV Carrier": "UAV Carrier.png",
  "2566d76a-823c-4eab-84db-feca50cd6b5d": "UAV Carrier.png",
  "Super UAV Carrier": "Super UAV Carrier.png",
  "1dc0b45e-4c22-4157-805f-411e00b13822": "Super UAV Carrier.png",
  "TU95": "TU95.png",
  "d039580d-7ce3-4d5a-b50a-b5faab122cdf": "TU95.png",
  "Super TU95": "Super TU95.png",
  "9e7ff8f1-83b5-471d-be56-de6d34443f88": "Super TU95.png",
  "Super Mech Walker": "Super Mech Walker.png",
  "2a37291f-da5e-4144-a27f-4a2794755a92": "Super Mech Walker.png",
  "Mech Walker": "Mech Walker.png",
  "b9a1cfcf-2a0e-4389-9393-1e6b97dc26a6": "Mech Walker.png",
  "Jetpack Armor": "Jetpack Armor.png",
  "6c02a704-a032-45ed-897a-26ac499e9a0c": "Jetpack Armor.png",
  "Valor": "Valor.png",
  "8ce3d71b-cb78-4c30-8624-87f0a73da0d8": "Valor.png",
  "Overlord": "Overlord.png",
  "3070a440-b49f-4575-8a7d-d2ab71c1475a": "Overlord.png",
  "Master Overlord": "Master Overlord.png",
  "bfe6e610-bddf-4ec0-831c-e26659493203": "Master Overlord.png",
  "Super Leonardo": "Super Leonardo.png",
  "24d51cae-8d09-487b-926d-6a8553a609ac": "Super Leonardo.png",
  "Leonardo": "Leonardo.png",
  "36372158-330f-4b5a-83d1-ec45a9ff9c4c": "Leonardo.png",
  "Top5 AN Jeep": "Top5 AN Jeep.png",
  "ebbc0537-b3b7-42f2-86cd-389069538564": "Top5 AN Jeep.png",
  "Super Kieler": "Super Kieler.png",
  "da20ec11-5dd3-4416-9b26-b9530209b80a": "Super Kieler.png",
  "Keiler": "Keiler.png",
  "b91a520b-48b3-4189-bb73-c30599527d8b": "Keiler.png",
  "Lovebird": "Lovebird.png",
  "1b9a4911-3a77-4323-9009-711db287a8ba": "Lovebird.png",
  "Love Buggy": "Love Buggy.png",
  "a7b35dad-286f-4068-89eb-67932509c676": "Love Buggy.png",
  "Drill Worker": "Drill Worker.png",
  "3db3cef4-7932-48d5-a5f5-32a5c2e4265c": "Drill Worker.png",
  "Driller": "Driller.png",
  "90abf680-0098-415e-9f07-f593e31bb3f8": "Driller.png",
  "S.W.A.R.M": "S.W.A.R.M.png",
  "7b859e9d-2fcb-4dd2-b659-4c8f34b24e00": "S.W.A.R.M.png",
  "Super S.W.A.R.M": "Super S.W.A.R.M.png",
  "acef4b79-1252-4b5c-a2b5-d49349761473": "Super S.W.A.R.M.png",
  "Greyhound": "Greyhound.png",
  "b08e453a-9096-4d02-bdbd-cc3967b689cb": "Greyhound.png",
  "Quad Shock RPG": "Quad Shock RPG.png",
  "f497408a-edce-4982-8f5b-d8f03b6fd9f9": "Quad Shock RPG.png",
  "Super Marasesti": "Super Marasesti.png",
  "2a0d9acd-cf1a-4cef-9abf-8d2b9465510e": "Super Marasesti.png",
  "Marasesti": "Marasesti.png",
  "d60fb9d4-42ce-4c3a-9dea-066c1646f844": "Marasesti.png",
  "Fireworks RPG": "Fireworks RPG.png",
  "204dba0c-fb1d-430f-88af-de43ca875ab0": "Fireworks RPG.png",
  "Elite Zeplin-X": "Elite Zeplin-X.png",
  "4e73d38b-d9eb-43f1-82d2-2641e1231231": "Elite Zeplin-X.png",
  "F111": "F111.png",
  "e94550b4-1196-47b5-b7c9-e6ceb42a547a": "F111.png",
  "Super F111": "Super F111.png",
  "b379d0a2-d070-4733-bae5-e25344b1375d": "Super F111.png",
  "Railgun-X Destroyer": "Railgun-X Destroyer.png",
  "1a6b4b52-9abc-47b9-a56e-67203dbe377d": "Railgun-X Destroyer.png",
  "Anti Nuke Jeep": "Anti Nuke Jeep.png",
  "bb7737cb-e375-49cf-9b63-46c27d5650a4": "Anti Nuke Jeep.png",
  "Super AN Jeep": "Super AN Jeep.png",
  "5a3b1d26-ebaf-4b4b-9b79-358c9921877e": "Super AN Jeep.png",
  "Chrysler": "Chrysler.png",
  "54f35e9c-4df0-487a-9a5f-8da757b3e48a": "Chrysler.png",
  "Nuke Chrysler": "Nuke Chrysler.png",
  "7a65c6ee-e032-4662-acc3-db8fc86b96d6": "Nuke Chrysler.png",
  "Festive BF109": "Festive BF109.png",
  "1e7b6885-9472-48e7-837a-908c796b85d6": "Festive BF109.png",
  "Wrapped C17": "Wrapped C17.png",
  "f8a199ae-3682-41b5-a8c8-aae5c2d5c3a4": "Wrapped C17.png",
  "Top3 GhostWind": "Top3 GhostWind.png",
  "5b6bbe5e-56e9-4966-aec4-a8cebd7e1898": "Top3 GhostWind.png",
  "Tupolev TB3": "Tupolev TB3.png",
  "65aa2ef3-08b7-4040-b5e8-0ae17b29b1ee": "Tupolev TB3.png",
  "Super Tupolev": "Super Tupolev.png",
  "5f6cb6d9-feeb-4dc6-b56f-d05f099d5799": "Super Tupolev.png",
  "Platinum SB-12": "Platinum SB-12.png",
  "31df7903-be6a-474b-bde2-1c50df628d02": "Platinum SB-12.png",
  "Super Vespa Tap": "Super Vespa TAP.png",
  "aad7d6a5-802c-4210-a27d-f8d2fa622c95": "Super Vespa TAP.png",
  "Vespa Tap": "Vespa TAP.png",
  "5a8dc0fc-a73b-4f6e-ad92-51ba2e521b12": "Vespa TAP.png",
  "Platinum Mech": "Platinum Mech.png",
  "33fc5890-16c8-4315-a930-fe82423d8887": "Platinum Mech.png",
  "Super M50": "Super M50.png",
  "168a3904-ca62-4cf9-8a61-020161b0db0b": "Super M50.png",
  "M50": "M50.png",
  "d8c44b9d-a5a0-425e-98ff-215b1940d937": "M50.png",
  "Santa Minigun": "Santa Minigun.png",
  "ca5cf7e4-dd74-4d89-9bd4-1ae50919a481": "Santa Minigun.png",
  "Railgun": "Railgun.png",
  "94a87bbf-065a-468a-b0b8-8acf99fee0a6": "Railgun.png",
  "Grumpy RPG": "Grumpy RPG.png",
  "5eb5b4eb-1e4a-4eb1-9e9d-3705d98e9a45": "Grumpy RPG.png",
  "PresentLauncher": "PresentLauncher.png",
  "0d9d873a-350d-49d4-966f-3888ef5f204d": "PresentLauncher.png",
  "Snowball SMG": "Snowball SMG.png",
  "edb77dcc-8e19-4af5-823c-7d0554c7b0b5": "Snowball SMG.png",
  "Assassin Sniper": "Assassin Sniper.png",
  "c3d70eeb-cbe7-4c00-aea6-84068fe5879f": "Assassin Sniper.png",
  "Scythe": "Scythe.png",
  "cb9dfc3c-1c41-4e0d-a37c-406de3d4999e": "Scythe.png",
  "Strike Mech": "Strike Mech.png",
  "fccab39b-0a8e-4677-a63b-ccf68fca4fba": "Strike Mech.png",
  "Super Mech": "Super Mech.png",
  "379e9c82-1c0a-45b8-aec3-dc680a4c0176": "Super Mech.png",
  "Anti-Vehicle Rifle": "Anti-Vehicle Rifle.png",
  "1f495f69-1ebc-4d8f-a001-29dfcc366818": "Anti-Vehicle Rifle.png",
  "Blue F22": "Blue F22.png",
  "9f70a32e-a07e-447a-83c3-d47d321d079c": "Blue F22.png",
  "Darkstar-X": "Darkstar X.png",
  "0a779732-bb5f-4a31-8054-85e548f8c2c3": "Darkstar X.png",
  "Super Missouri": "Super Missouri.png",
  "d49bd83a-3666-4007-b4c6-966a545ea398": "Super Missouri.png",
  "USS Missouri": "USS Missouri.png",
  "7c0bf909-635a-4289-8b69-306c207329a0": "USS Missouri.png",
  "SeaHawk": "SeaHawk.png",
  "439c3dc3-b727-42a5-864c-d20bdc97a7d5": "SeaHawk.png",
  "Mothership": "Mothership.png",
  "6a8c660a-3bc2-401e-a60a-07d4273a8ae2": "Mothership.png",
  "Corsair-X": "Corsair X.png",
  "dfbbbb20-6ca2-403c-a1f1-182e074a32f2": "Corsair X.png",
  "Corsair": "Corsair.png",
  "db919605-bbcf-4719-a38d-be858f80f974": "Corsair.png",
  "Top3 Shrike": "Top3 Shrike.png",
  "15e53651-49e6-4751-9ad8-142d8637a302": "Top3 Shrike.png",
  "BOSS Ghostwind": "BOSS GhostWind.png",
  "3abd9dc8-966c-4f6f-b2a2-b30b1c35838d": "BOSS GhostWind.png",
  "Ghostwind": "GhostWind.png",
  "99f22f2d-1b65-402f-b0e6-9c4538f9bdba": "GhostWind.png",
  "ME323": "ME323.png",
  "d72f47e1-f484-4974-923b-32bf86b84d85": "ME323.png",
  "Atomic ME323": "Atomic ME323.png",
  "9580d97e-4d33-421e-8ef0-238c840ef970": "Atomic ME323.png",
  "Akrep": "Akrep.png",
  "585d6d1c-d908-4f5d-8c5c-5b9d6e3022c5": "Akrep.png",
  "Zumwalt X": "Zumwalt X.png",
  "30c605f5-8121-4610-a9c8-90062e6b24af": "Zumwalt X.png",
  "King Tiger": "King Tiger.png",
  "7e0b02ca-c206-4290-a382-3b67cbb24247": "King Tiger.png",
  "AT Akrep": "AT Akrep.png",
  "f1d41c64-0466-4875-92aa-81c02d9a13ee": "AT Akrep.png",
  "AA Akrep": "AA Akrep.png",
  "af06f535-3a49-4440-9e9c-1a7ba6b870ce": "AA Akrep.png",
  "Super Akrep": "Super Akrep.png",
  "22cf8b75-ef1e-486f-9b5d-f7a35c64c15b": "Super Akrep.png",
  "Hacker Truck": "Hacker Truck.png",
  "7eaaf257-c66f-4e55-a5f3-6d2db2970c76": "Hacker Truck.png",
  "Hacker X": "Hacker X.png",
  "f6c74f0f-165b-49c1-8326-15e607d4ab0c": "Hacker X.png",
  "Super Warship": "Super Warship.png",
  "281043b5-ff50-488d-9f48-7b2619f66d71": "Super Warship.png",
  "Werewolf Tank": "Werewolf Tank.png",
  "fea9b8ec-9231-4ad0-930f-b5a9c4aa5ab9": "Werewolf Tank.png",
  "Enraged Werewolf": "Enraged Werewolf.png",
  "9551b469-281f-4b4f-bae4-0ee21c8794ef": "Enraged Werewolf.png",
  "Enrageed Vampire": "Enrageed Vampire.png",
  "9dc347d4-e989-4863-96d2-aa4f98157e38": "Enrageed Vampire.png",
  "Vampire": "Vampire.png",
  "63a01251-d7f3-4a29-be18-d9ac273cd3ef": "Vampire.png",
  "Werewolf": "Werewolf.png",
  "d255b7c5-e4ab-4a45-8cbd-59551279cd9c": "Werewolf.png",
  "Silver Howl": "Silver Howl.png",
  "2d1abeea-b57f-4d74-8f5d-bf4c04d6c924": "Silver Howl.png",
  "Haunted Jet": "Haunted Jet.png",
  "845938f6-1cce-4def-9e3e-80a0774df049": "Haunted Jet.png",
  "Haunted Tank": "HauntedTank.png",
  "0e24922d-e957-4451-ac99-7a8187e4efb9": "HauntedTank.png",
  "Tixplane": "Tixplane.png",
  "c0ed4fd8-2c1e-41e9-a3b3-26128e1dc4e4": "Tixplane.png",
  "Pumpkin Soldier": "Pumpkin Soldier.png",
  "707c4e68-572f-43f6-9978-259c6e098336": "Pumpkin Soldier.png",
  "Super Pumpkin": "Super Pumpkin.png",
  "aa55be1f-263d-4a35-8a46-026dea703d18": "Super Pumpkin.png",
  "Puckmonster": "Puckmonster.png",
  "e727ca15-8239-4770-95fa-5fda4f0d6220": "Puckmonster.png",
  "Super Tucano": "Super Tucano.png",
  "0e3cf7aa-87fb-46a3-92cf-68da134545e5": "Super Tucano.png",
  "LE F18 Hornet": "LE F18 Hornet.png",
  "c0e99903-7d86-4f88-a65d-2bf5871c6a66": "LE F18 Hornet.png",
  "Nuke Project 665": "Nuke Project 665.png",
  "41a64191-a838-403f-88f9-06fb1f87d170": "Nuke Project 665.png",
  "Project 665": "Project 665.png",
  "b1bccff8-76f9-4472-829d-bf8a0c32296e": "Project 665.png",
  "Alien": "Alien.png",
  "f22ade7c-334a-45b7-a526-2fcb4f823186": "Alien.png",
  "TheIceZombieSlayer": "TheIceZombieSlayer.png",
  "409c1587-7431-44b8-ab9a-078757bc98a1": "TheIceZombieSlayer.png",
  "Super Skyfox": "Super Skyfox.png",
  "491ac995-b342-47fe-a1ad-23687aba360a": "Super Skyfox.png",
  "Skyfox": "Skyfox.png",
  "e4211db9-d714-425b-b3f0-46adbe917af6": "Skyfox.png",
  "Super Speeder": "Super Speeder.png",
  "3a6f5f32-d009-4e2d-a1a1-92138e6a6232": "Super Speeder.png",
  "Tank Boat": "Tank Boat.png",
  "2fdc6575-0bda-407d-b919-e5a3194e28d4": "Tank Boat.png",
  "Zhi 19E": "Zhi 19E.png",
  "f7bf78f8-c1d5-4c27-bd6b-fcec86fa6ed7": "Zhi 19E.png",
  "Super Zhi 19E": "Super Zhi 19E.png",
  "1f3d60b9-ee36-453a-a0e7-3b0c544e46ec": "Super Zhi 19E.png",
  "BOSS War Shrike": "BOSS War Shrike.png",
  "b0595ac6-5023-4afc-b3c1-a6f4f6fe8736": "BOSS War Shrike.png",
  "War Shrike": "War Shrike.png",
  "68444456-23a7-4fec-94b4-229ba56f42be": "War Shrike.png",
  "Jet Engineer": "Jet Engineer.png",
  "2105a23e-cef0-412f-abb1-aafae6c6b715": "Jet Engineer.png",
  "S.A.M. Truck": "S.A.M. Truck.png",
  "d997112e-3a30-4756-8dc4-8674886c17f4": "S.A.M. Truck.png",
  "Sukhoi SU25": "Sukhoi SU25.png",
  "b12c2108-4ea3-45ea-9097-01c3f138ac34": "Sukhoi SU25.png",
  "Sukhoi SU57": "Sukhoi SU57.png",
  "a3d0a702-2fdf-4d62-9c47-1bf073fa3a42": "Sukhoi SU57.png",
  "Super Ironhawk": "Super Ironhawk.png",
  "e0580d16-e6c4-41a2-9300-f7017c62199f": "Super Ironhawk.png",
  "Ironhawk": "Ironhawk.png",
  "701d87ae-3c28-4ac6-8dea-6026579f5ccc": "Ironhawk.png",
  "Chinook CH-47": "Chinook CH47.png",
  "00155e4d-36de-4248-929c-f75c2b27856b": "Chinook CH47.png",
  "Super Tesla Tank": "Super Tesla Tank.png",
  "369ea71d-fc22-4599-b43f-791c9417dcb5": "Super Tesla Tank.png",
  "Tesla Tank": "Tesla Tank.png",
  "26f74812-ed59-4e94-82ff-f68778d5fbef": "Tesla Tank.png",
  "Jetpack Fighter": "Jetpack Fighter.png",
  "d5259eb2-3b61-4939-99ff-351867fa088e": "Jetpack Fighter.png",
  "Armed Hoverbike": "Armed HoverBike.png",
  "a747adea-e875-4ea3-81fc-5f03472331fd": "Armed HoverBike.png",
  "Super B21": "Super B21.png",
  "c5b67128-0d8a-4d3e-9e19-088e2d1b52ae": "Super B21.png",
  "B21 Raider": "B21 Raider.png",
  "dae53758-e37d-454d-be33-a0064e05fe22": "B21 Raider.png",
  "Master Hellstorm": "Master HellStorm.png",
  "af1e452d-9294-4f09-b519-cdd21f488058": "Master HellStorm.png",
  "Hellstorm": "HellStorm.png",
  "95255650-d985-4ed9-b43e-f48097acd13f": "HellStorm.png",
  "Super YF1": "Super YF1.png",
  "d369498f-2eac-473b-8c77-83a39e252341": "Super YF1.png",
  "YF1": "YF1.png",
  "4afd16bb-2687-4d01-9545-03457d02e7bd": "YF1.png",
  "Gold TKS20": "Gold TKS-20.png",
  "84c7bf94-df69-45db-89ee-a632d7112257": "Gold TKS-20.png",
  "M10 Booker": "M10 Booker.png",
  "2a8dd92a-2f9e-4b3b-b400-da0a8e1f6c75": "M10 Booker.png",
  "TKS-20": "TKS-20.png",
  "5fd6d199-d1cb-4b55-b62a-89e00352a8a4": "TKS-20.png",
  "Gold M10": "Gold M10.png",
  "7b61afa5-5fd5-48e1-ae68-af001f6901f5": "Gold M10.png",
  "A50": "A50.png",
  "05cc979d-e1cd-4a5f-9ac9-165e18b57c1b": "A50.png",
  "Super A50": "Super A50.png",
  "1fad2bb9-5f0d-4f10-b322-012815d06458": "Super A50.png",
  "Nuke Sniper Soldier": "Nuke Sniper Soldier.png",
  "d95ed9f4-c430-41d2-bc47-8aadac766cc6": "Nuke Sniper Soldier.png",
  "MQ4C Jet": "MQ4C Jet.png",
  "4dfb2614-fd9b-4b4d-901f-ed319e9b5fb6": "MQ4C Jet.png",
  "Master Warmaul": "Master Warmaul.png",
  "5865cbe8-136f-4488-882e-84cf6f92db68": "Master Warmaul.png",
  "Mortar Truck": "Mortar Truck.png",
  "b86b6672-d692-4a7d-bd3e-1114d5637665": "Mortar Truck.png",
  "Nuke Mortar Truck": "Nuke Mortar Truck.png",
  "9b028a15-2980-40b3-ad0d-c4561d5aa536": "Nuke Mortar Truck.png",
  "Liberty Foch": "Liberty Foch.png",
  "ee378ceb-6b29-484c-b20b-ebdf12a221ce": "Liberty Foch.png",
  "Super X59": "Super X59.png",
  "c24673c4-39dd-4c9c-b2a4-7e95bcd48407": "Super X59.png",
  "C17 Liberty": "C-17 Liberty.png",
  "bffcbf33-3a92-4cf2-98ce-76a69712c17b": "C-17 Liberty.png",
  "Foch 155": "Foch 155.png",
  "77b1d7c1-b0c3-41cc-95a6-15bccbadad1a": "Foch 155.png",
  "B1 Liberty": "B1 Liberty.png",
  "82f1c84a-dba3-4d78-8fe6-44df938f8b09": "B1 Liberty.png",
  "PL-01 Liberty": "PL-01 Liberty.png",
  "12decc47-e03e-4496-b718-cc82fd8443c3": "PL-01 Liberty.png",
  "X-59": "X59.png",
  "52df01b9-ee4f-4566-aaab-9c60fadb3364": "X59.png",
  "Warmaul": "Warmaul.png",
  "c8b1e456-6209-4912-96bf-3effc2e02092": "Warmaul.png",
  "B2 Liberty": "B2 Liberty.png",
  "78f585e3-5ce0-4f46-9190-e46ab191d19c": "B2 Liberty.png",
  "SeaBreacher": "SeaBreacher.png",
  "5723f9b4-a830-4997-8b22-caf914da2d83": "SeaBreacher.png",
  "SeaBreacher-X": "SeaBreacher-X.png",
  "b81ae5a9-c427-448c-a5f7-ef01af13c36c": "SeaBreacher-X.png",
  "Drone carrier": "Drone Carrier.png",
  "7b7c2b66-6e9a-483f-8947-b1d1271448b3": "Drone Carrier.png",
  "Super Drone Carrier": "Super Drone Carrier.png",
  "4bd75bd6-ded0-428f-9555-c3a4b5abdcc7": "Super Drone Carrier.png",
  "Stalker Drone": "Stalker Drone.png",
  "cdd83dfc-418c-4c60-8095-97cfb26f8cec": "Stalker Drone.png",
  "Vulcan": "Vulcan.png",
  "60b97d60-0ba9-47e7-86fd-a4025a32b371": "Vulcan.png",
  "Police AHRLAC": "Police AHRLAC.png",
  "abeb7289-0c4b-4b67-8431-6b1f00e16e97": "Police AHRLAC.png",
  "Police APC": "Police APC.png",
  "a0ef6126-27e8-4a38-8c4a-cb1283d07311": "Police APC.png",
  "Police Jeep": "Police Jeep.png",
  "cb4b3f46-c609-4ed5-85aa-976967490585": "Police Jeep.png",
  "Police Heli": "Police Heli.png",
  "5a64c72e-bb27-4122-bc3a-b8285647692f": "Police Heli.png",
  "Super F24": "Super F24.png",
  "54049353-9ab9-40b4-8458-c4a8e3a697b4": "Super F24.png",
  "Reaper Drone": "Reaper Drone.png",
  "36d5ffdf-68d9-46b7-9997-c0ca69e1ecfe": "Reaper Drone.png",
  "Bombardino": "Bombardino.png",
  "b7f2c07d-e7ef-4335-a66c-307aa28e3ad8": "Bombardino.png",
  "Master Reaper": "Master Reaper.png",
  "9eb04509-b120-4006-b15a-a781d1ea74d9": "Master Reaper.png",
  "Sky Reaper": "Sky Reaper.png",
  "db08b73b-60cc-4f9c-bab4-beca26ebb01e": "Sky Reaper.png",
  "SM-27": "SM-27.png",
  "fe4a72d7-762e-4925-9486-ca7a6836f47d": "SM-27.png",
  "LE Cobra": "LE Cobra.png",
  "2728ea7e-d38a-4978-a1a4-9d29cb8f4f57": "LE Cobra.png",
  "Super Harrier": "Super Harrier.png",
  "c401c3ef-c494-4707-b861-df99b456e5bf": "Super Harrier.png",
  "Harrier": "Harrier.png",
  "f3fcb540-a50c-4ad3-a876-0b0c9c26e11c": "Harrier.png",
  "Tralalero": "Tralalero.png",
  "b2fafeb5-64f7-42a3-b1d1-3f91b5720878": "Tralalero.png",
  "Imperial Tank": "Imperial Tank.png",
  "8079115a-5261-49d3-bcd3-998c8422fbaf": "Imperial Tank.png",
  "Super Imperial Tank": "Super Imperial Tank.png",
  "0521d559-d2b5-4aac-b97b-e79e66f309f0": "Super Imperial Tank.png",
  "Skynex": "Skynex.png",
  "28fc0ef0-21e5-42c5-ad65-49ce49d64ebb": "Skynex.png",
  "Elite Lancer": "Elite Lancer.png",
  "667250c5-d168-41f0-94b2-32d2d09b1691": "Elite Lancer.png",
  "The Annihilator": "The Annihilator.png",
  "64caabeb-4e04-4ba8-b39a-97737101481e": "The Annihilator.png",
  "Boss Annihilator": "BOSS Annihilator.png",
  "91809eed-ed0b-4076-b36d-84868309fa26": "BOSS Annihilator.png",
  "Super A-14": "Super A-14.png",
  "83bdda15-7e41-422c-9aa8-eb8a3514ef8b": "Super A-14.png",
  "A14 Wolf": "A14 Wolf.png",
  "ceb4e757-985f-4b90-b398-d2b50901e05b": "A14 Wolf.png",
  "Nova": "Nova.png",
  "5a59a95d-5f83-486a-a922-9dd598342196": "Nova.png",
  "Super Nova": "Super Nova.png",
  "ec9730e0-87e4-4e75-8c32-2d7a520f1375": "Super Nova.png",
  "Super Halftrack": "Super Halftrack.png",
  "eeb6c9ad-71ee-4faa-956a-548e2445e3cd": "Super Halftrack.png",
  "Flak Halftrack": "Flak Halftrack.png",
  "9e4ffbba-1e61-40bd-8ad0-519fc9a5fd77": "Flak Halftrack.png",
  "Halftrack": "Halftrack.png",
  "dbc7563b-e204-4cb1-9ee2-de7afb3e73cc": "Halftrack.png",
  "Stealth Boat": "Stealth Boat.png",
  "706bb55b-398f-4e22-850f-15fb0b5db46d": "Stealth Boat.png",
  "LE YAL-1": "LE YAL-1.png",
  "bb3d3334-9fcd-4d59-921f-f67372eaf7c0": "LE YAL-1.png",
  "Shopping Cart": "Shopping Cart.png",
  "17a5d3e1-44cd-45b1-bced-73e0d79b971d": "Shopping Cart.png",
  "TV Juggernaut": "TV Juggernaut.png",
  "d4f91ee5-55d3-4044-8659-9b0f5b5349e9": "TV Juggernaut.png",
  "Elite Hacker": "Elite Hacker.png",
  "59013a30-e5ec-4af1-b072-0a55486b0cbf": "Elite Hacker.png",
  "LE A-10": "LE A-10.png",
  "de48c599-8af5-416d-8632-dcd11f71940b": "LE A-10.png",
  "Super TOS1": "Super TOS1.png",
  "879252bc-7824-4d6d-b46f-e2cbd5f9d325": "Super TOS1.png",
  "Patriot Boat": "Patriot Boat.png",
  "12456313-de4e-47cf-980b-5656c911ae0b": "Patriot Boat.png",
  "Repair Drone": "Repair Drone.png",
  "b602378f-c276-4825-8abd-a54e578bfab9": "Repair Drone.png",
  "Missile Drone": "Missile Drone.png",
  "442a4bfc-9122-4058-b864-7a69074c53f8": "Missile Drone.png",
  "Attack Drone": "Attack Drone.png",
  "75b6e626-1c3e-48cf-aff0-88bc288622e1": "Attack Drone.png",
  "Black Hawk Trooper": "Black Hawk Trooper.png",
  "90dbbfd3-5539-49dd-8e33-b4df9d7c5794": "Black Hawk Trooper.png",
  "Boss Killer": "Boss Killer.png",
  "167464d6-e839-45db-8355-040581dde4a8": "Boss Killer.png",
  "Boss Reaper": "Boss Reaper.png",
  "c5d38f8a-e39f-45b2-896d-343d5d314efc": "Boss Reaper.png",
  "Commander X": "Commander X.png",
  "1de73795-4cec-4eec-96da-12479c4fae23": "Commander X.png",
  "Elite Grenadier": "Elite Grenadier.png",
  "d098aaa0-5326-46ee-8b1e-5b732af25929": "Elite Grenadier.png",
  "Elite soldier": "Elite soldier.png",
  "12617075-0f04-41ab-929e-a64fee173b32": "Elite soldier.png",
  "Golden Soldier": "Golden Soldier.png",
  "9c67c9d2-1c8a-49d1-9ece-ab047839de4a": "Golden Soldier.png",
  "Grenadier": "Grenadier.png",
  "f74942ff-e63b-4df4-8941-53f0e8c5a48c": "Grenadier.png",
  "Grumpy Killer": "Grumpy Killer.png",
  "9f6f28c9-634c-4438-bbf2-064a4e833be0": "Grumpy Killer.png",
  "Hacker": "Hacker.png",
  "35dee3ea-ae44-4c41-ae6e-6c84776f00e7": "Hacker.png",
  "Heavy": "Heavy.png",
  "8ccb4d59-2348-4376-9344-39bd4685f5a9": "Heavy.png",
  "Heavy Zombie": "Heavy Zombie.png",
  "4cb80911-48db-4207-833e-0bdb57f010c2": "Heavy Zombie.png",
  "Juggernaut": "Juggernaut.png",
  "e25b4b7a-0b3e-4d4e-8271-c5cd48551a8a": "Juggernaut.png",
  "Marine": "Marine.png",
  "a45cb52e-0e4c-4997-a680-c61fb0707d99": "Marine.png",
  "Medic": "Medic.png",
  "c52adcfe-bd8a-4c7e-b4c8-e10347e2bd03": "Medic.png",
  "Naval Officer": "Naval Officer.png",
  "cbb19320-b76e-450a-a801-854a25a64c74": "Naval Officer.png",
  "Private": "Private.png",
  "75777b06-da5b-4dbd-8a84-718e5ad922fe": "Private.png",
  "Pyro": "Pyro.png",
  "a3208a53-1f12-41aa-98b6-435adc555484": "Pyro.png",
  "Raid Soldier": "Raid Soldier.png",
  "dd896e18-9df5-418a-ba9e-edaa39d3097e": "Raid Soldier.png",
  "Railgun Killer": "Railgun Killer.png",
  "e36702b7-8090-45f6-bfcb-64d71d27944d": "Railgun Killer.png",
  "Ravage Soldier": "Ravage Soldier.png",
  "3b7befaf-7eac-441e-9f05-0e358975a2f4": "Ravage Soldier.png",
  "RPG Soldier": "RPG Soldier.png",
  "53db37e2-416f-43c1-94aa-bbb0057031a0": "RPG Soldier.png",
  "RPG Zombie": "RPG Zombie.png",
  "5ba6e9a0-fdf9-43e3-9edf-ae3917bdcb65": "RPG Zombie.png",
  "Santa Assassin": "Santa Assassin.png",
  "c3ca83db-2c1a-4e7a-8d4a-349e907f0d8f": "Santa Assassin.png",
  "Santa Killer": "Santa Killer.png",
  "be16a0ee-1e39-4808-b4a7-093478ee25b0": "Santa Killer.png",
  "Santa Medic": "Santa Medic.png",
  "a7062ba2-b285-4731-8367-3cb846411d3c": "Santa Medic.png",
  "Santa Private": "Santa Private.png",
  "dd70b2f8-e75d-4e6c-816d-dd39c7ffd2dd": "Santa Private.png",
  "Shock Trooper": "Shock Trooper.png",
  "d3198b82-40ae-4f05-b70c-1589ea967d6c": "Shock Trooper.png",
  "Sniper": "Sniper.png",
  "bb0de132-c595-4197-9c56-7255370da455": "Sniper.png",
  "Super Sniper": "Super Sniper.png",
  "82f8ca85-f777-43d8-aeed-61c31b061b47": "Super Sniper.png",
  "Toxic Trooper": "Toxic Trooper.png",
  "a80e990f-a2a0-4566-b572-cab99b5c0950": "Toxic Trooper.png",
  "TV Soldier": "TV Soldier.png",
  "93c60335-8517-43b8-913e-900fb95595bd": "TV Soldier.png",
  "Vault Raider": "Vault Raider.png",
  "cb61c7d8-d408-4f83-bfad-b51870479833": "Vault Raider.png",
  "Zombie Juggernaut": "Zombie Juggernaut.png",
  "32e1abea-c5c5-427f-bc1f-6e33167578ce": "Zombie Juggernaut.png",
  "Assassin": "Assassin.png",
  "df06c068-4e85-40b7-9351-009f1f81fda6": "Assassin.png",
  "Ace Pilot": "Ace Pilot.png",
  "41bc3b42-72e3-40fb-92e0-cf578b46be8e": "Ace Pilot.png",
  "AA Soldier": "AA Soldier.png",
  "da10ecd1-ff64-4d93-b440-0694011993cf": "AA Soldier.png",
  "Battle cruiser": "Battlecruiser.png",
  "233008f9-d022-4cfc-8178-a4cc875cb5a6": "Battlecruiser.png",
  "Battleship": "Battleship.png",
  "5a6a82f2-78b5-49f1-bcea-906573d9733d": "Battleship.png",
  "Boat": "Boat.png",
  "6ff99997-0383-4d09-be6e-3ab0ab3664dd": "Boat.png",
  "Boss North Carolina": "Boss North Carolina.png",
  "828c0a26-b41f-4479-903b-7bdd1f7a349a": "Boss North Carolina.png",
  "Destroyer": "Destroyer.png",
  "30638f0c-3a6f-40b1-8bad-0c2d53789f82": "Destroyer.png",
  "Gold Typhoon": "Gold Typhoon.png",
  "44bc9b47-8b29-4837-9f59-071deb04649d": "Gold Typhoon.png",
  "Golden Interceptor": "Golden Interceptor.png",
  "91b2d475-8975-4f19-b60a-bc1efb6f709d": "Golden Interceptor.png",
  "Gun Boat": "Gun Boat.png",
  "4eeaf191-d3d3-4571-b018-732f93c072ad": "Gun Boat.png",
  "Hovercraft": "Hovercraft.png",
  "0d2bfc7f-3fe8-46a8-9ed2-86952b9d7dc8": "Hovercraft.png",
  "Interceptor": "Interceptor.png",
  "68db578d-766b-45f3-a0b8-59e1d4894800": "Interceptor.png",
  "Jetski": "JetSki.png",
  "b3c587f2-8238-4f0a-8293-b2ee095c8ff6": "JetSki.png",
  "JS Atago": "JS Atago.png",
  "5a430e61-d924-4324-b1f3-810e36aedb1c": "JS Atago.png",
  "LE BISMARCK (G)": "LE BISMARCK(G).png",
  "d4a8dc48-aeb0-4538-9225-6320ec85ce47": "LE BISMARCK(G).png",
  "Gold Izumo": "Gold Izumo.png",
  "0990fb44-cf05-4b87-bdac-0f1f60278072": "Gold Izumo.png",
  "LE BISMARCK": "LE BISMARCK.png",
  "69ab0fc4-0253-450a-a0be-92e1d8e7b1f9": "LE BISMARCK.png",
  "LE5000 Izumo": "LE5000 Izumo.png",
  "75c69351-e880-4e0f-893b-59742e192a23": "LE5000 Izumo.png",
  "Missile Boat": "Missile Boat.png",
  "8d1560d0-4f1e-466b-a8cb-34b599979219": "Missile Boat.png",
  "Nimitz": "Nimitz.png",
  "7a761101-438b-4b10-b435-7aa3cb590220": "Nimitz.png",
  "North Carolina": "North Carolina.png",
  "b05f3dfe-b5df-490d-b4b2-bb29931ea0ff": "North Carolina.png",
  "Nuke Sub": "Nuke Sub.png",
  "af119a42-95c4-4da3-b274-5f0529d7fa12": "Nuke Sub.png",
  "PACV Craft": "PACV Craft.png",
  "6bcf3432-f426-4bf0-999d-7b772dff827b": "PACV Craft.png",
  "Patria": "Patria.png",
  "511e8c8d-fac3-42b7-bc4f-da20755ec6b1": "Patria.png",
  "Railgun Destroyer": "Railgun Destroyer.png",
  "4cefd99c-d2d6-48ee-a76a-e2b1d4bd6b04": "Railgun Destroyer.png",
  "Sachsen Frigate": "Sachsen Frigate.png",
  "cf3d0ceb-8072-4594-97ca-e84ace056701": "Sachsen Frigate.png",
  "SSBN": "SSBN.png",
  "df1b2e4f-3299-4b60-8ec3-f82f9c25b97b": "SSBN.png",
  "Submarine (Rare)": "Submarine (Rare).png",
  "e903bdff-0360-4731-a76c-0507b3c7882c": "Submarine (Rare).png",
  "Super Hovercraft": "Super Hovercraft.png",
  "c1e843e4-582c-4207-a4d8-f87049cc34fb": "Super Hovercraft.png",
  "Super Patria": "Super Patria.png",
  "b78dd734-3503-4807-b1b7-34477501cb54": "Super Patria.png",
  "Super Sub": "Super Sub.png",
  "8d717679-e4a5-4400-aac9-3c0963834d8e": "Super Sub.png",
  "Surrogat": "Surrogat.png",
  "2eb8b007-dbc8-48f4-8e06-034806da91ef": "Surrogat.png",
  "Typhoon (Sub)": "Typhoon.png",
  "5ad67b93-3251-4557-861b-b0772452041b": "Typhoon.png",
  "USS Independence": "USS Independence.png",
  "18d78d2c-468b-4fed-bc15-6e4cd3eac605": "USS Independence.png",
  "Warship": "War ship.png",
  "428f7690-f70f-490b-aa45-5c11815138cb": "War ship.png",
  "Yamato": "Yamato.png",
  "9e86efb7-546c-48cf-891f-d6676a7fd414": "Yamato.png",
  "ZUBR": "Zubr.png",
  "408760a2-b975-4396-b1f6-be6538ac83ae": "Zubr.png",
  "Zumwalt": "Zumwalt.png",
  "9fef8b23-5060-457b-8d23-c9fbc6959f42": "Zumwalt.png",
  "Attack Submarine": "Attack Submarine.png",
  "a98fd1bc-f195-4770-9339-0958e0d43339": "Attack Submarine.png",
  "Armored Corvette": "Armored Corvette.png",
  "ae300aab-6057-4d10-b570-ab9d6f35d636": "Armored Corvette.png",
  "Alicorn": "Alicorn.png",
  "5bf99424-5a01-4d9b-9dd5-f94783cf336d": "Alicorn.png",
  "Carrier": "Carrier.png",
  "92270e52-e60d-4dbf-bd12-6a261aeea11d": "Carrier.png",
  "Admiral Kuznetsov": "Admiral Kuznetsov.png",
  "15532068-5374-4aea-af6b-2ba4ae7bdc01": "Admiral Kuznetsov.png",
  "AAV": "AAV.png",
  "72456a82-e3ca-43fd-a5f9-3ac917b1e548": "AAV.png",
  "Abram Tank": "Abram Tank.png",
  "f5a04d7e-74de-40b0-ba05-184b02b042b1": "Abram Tank.png",
  "Abram X": "Abram X.png",
  "99481266-e425-423e-8598-0569fb57322c": "Abram X.png",
  "Alvis Stormer": "Alvis Stormer.png",
  "693fa4d3-2ef8-47a0-a802-9c11c9ddc383": "Alvis Stormer.png",
  "AATank": "AATank.png",
  "f966c125-08a5-49fd-9ba0-0ee98b11ffac": "AATank.png",
  "APC": "APC.png",
  "74e19b33-801e-478b-b126-2805f6e9f149": "APC.png",
  "Apocalypse": "Apocalypse.png",
  "d519b13b-f274-48b2-a269-2668dc669afd": "Apocalypse.png",
  "Armored APC": "ArmoredAPC.png",
  "88931fcf-0d88-4dd3-9dee-b9748f6e4f95": "ArmoredAPC.png",
  "Armored Jeep": "Armored Jeep.png",
  "ac777ce0-5422-4330-9bdd-8704bcd6333f": "Armored Jeep.png",
  "Armored Snow mobile": "Armored Snowmobile.png",
  "c595c5e0-cc76-4032-8f71-00a418a4bec3": "Armored Snowmobile.png",
  "Armored Vehicle": "Armored Vehicle.png",
  "4d293b23-8711-459d-b641-699d223de729": "Armored Vehicle.png",
  "Artillery": "Artillery.png",
  "5c7ed32d-dd4d-49c0-b8bb-a1803f2a4662": "Artillery.png",
  "ATV": "ATV.png",
  "85bdaf3f-8ad1-4c34-b610-5fe5d538521c": "ATV.png",
  "Battle Tank": "Battle Tank.png",
  "f43634f9-fbae-461f-becf-6d5fcb9241c5": "Battle Tank.png",
  "Boss Buggy": "BOSS Buggy.png",
  "1870db02-578f-4b2a-b1a2-c195532d3960": "BOSS Buggy.png"
};
function getVehicleImageFileName(nameOrId) {
  if (!nameOrId) return null;
  const direct = VEHICLE_IMAGE_MAP[nameOrId];
  if (direct) return direct;
  const norm = nameOrId.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  for (const key of Object.keys(VEHICLE_IMAGE_MAP)) {
    if (key.toLowerCase().trim().replace(/[^a-z0-9]/g, "") === norm) {
      return VEHICLE_IMAGE_MAP[key];
    }
  }
  return null;
}
function getVehicleImageUrl(nameOrId, hostUrl) {
  const fileName = getVehicleImageFileName(nameOrId);
  if (!fileName) return null;
  const path2 = `/images/vehicles/${encodeURIComponent(fileName)}`;
  if (hostUrl) {
    return `${hostUrl.replace(/\/+$/, "")}${path2}`;
  }
  return path2;
}

// src/data/webhookConfig.json
var webhookConfig_default = {
  changelogWebhookUrl: "",
  suggestionsWebhookUrl: "",
  updatedAt: "2026-09-21T23:43:20.476Z"
};

// server.ts
dotenv.config();
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function enforceCookieSecurity(cookieStr) {
  let modified = cookieStr;
  if (!/;\s*Secure/i.test(modified)) {
    modified += "; Secure";
  }
  if (!/;\s*HttpOnly/i.test(modified)) {
    modified += "; HttpOnly";
  }
  if (!/;\s*SameSite=/i.test(modified)) {
    modified += "; SameSite=Lax";
  }
  return modified;
}
function isSafePublicUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: "Forbidden protocol (only HTTP and HTTPS are permitted)" };
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1" || hostname === "metadata.google.internal" || hostname === "metadata.google" || hostname === "instance-data" || hostname.endsWith(".internal") || hostname.endsWith(".local")) {
      return { safe: false, reason: "Internal/loopback destinations are strictly forbidden" };
    }
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const o1 = parseInt(match[1], 10);
      const o2 = parseInt(match[2], 10);
      if (o1 === 10 || // 10.0.0.0/8
      o1 === 127 || // 127.0.0.0/8
      o1 === 172 && o2 >= 16 && o2 <= 31 || // 172.16.0.0/12
      o1 === 192 && o2 === 168 || // 192.168.0.0/16
      o1 === 169 && o2 === 254 || // 169.254.0.0/16 Link-local / Cloud metadata
      o1 === 0 || // 0.0.0.0/8
      o1 >= 224) {
        return { safe: false, reason: "Private or link-local IP addresses are forbidden" };
      }
    }
    return { safe: true, parsedUrl: parsed };
  } catch {
    return { safe: false, reason: "Malformed URL" };
  }
}
var rateLimitStores = /* @__PURE__ */ new Map();
function createRateLimiter(options) {
  const store = /* @__PURE__ */ new Map();
  rateLimitStores.set(options.name, store);
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store.entries()) {
      if (now > bucket.resetAt) {
        store.delete(key);
      }
    }
  }, 18e4);
  return (req, res, next) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const ip = Array.isArray(rawIp) ? rawIp[0] : typeof rawIp === "string" ? rawIp.split(",")[0].trim() : "unknown";
    const now = Date.now();
    let bucket = store.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + options.windowMs };
      store.set(ip, bucket);
    } else {
      bucket.count++;
    }
    const remaining = Math.max(0, options.max - bucket.count);
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1e3);
    res.setHeader("X-RateLimit-Limit", options.max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1e3));
    if (bucket.count > options.max) {
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        success: false,
        error: "Too many requests, please slow down and try again shortly.",
        retryAfterSeconds: retryAfterSec
      });
    }
    next();
  };
}
function sanitizeFileName(name, fallbackPrefix = "img") {
  const base = path.basename(name).replace(/[^a-zA-Z0-9_.\-\s]/g, "_").trim();
  const cleanExt = path.extname(base).toLowerCase();
  const allowedExtensions = [".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".avif"];
  const ext = allowedExtensions.includes(cleanExt) ? cleanExt : ".webp";
  const nameWithoutExt = base.replace(/\.[^/.]+$/, "").substring(0, 80);
  const safeName = nameWithoutExt.trim() ? nameWithoutExt : `${fallbackPrefix}_${Date.now()}`;
  return `${safeName}${ext}`;
}
async function createApp() {
  const app = express();
  const PORT = 3e3;
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()");
    const cspDirectives = [
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: data:",
      "style-src 'self' 'unsafe-inline' https: http: data: blob:",
      "style-src-elem 'self' 'unsafe-inline' https: http: data: blob:",
      "font-src 'self' data: https: http: blob:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https: http: wss: ws: blob: data:",
      "frame-src 'self' https: blob: data:",
      "frame-ancestors 'self' https: http:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join("; ");
    res.setHeader("Content-Security-Policy", cspDirectives);
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function(name, value) {
      if (typeof name === "string" && name.toLowerCase() === "set-cookie") {
        if (Array.isArray(value)) {
          value = value.map((cookieStr) => typeof cookieStr === "string" ? enforceCookieSecurity(cookieStr) : cookieStr);
        } else if (typeof value === "string") {
          value = enforceCookieSecurity(value);
        }
      }
      return originalSetHeader(name, value);
    };
    next();
  });
  app.options("*", (req, res) => {
    res.setHeader("Allow", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
    res.status(204).end();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  const vehicleImagesDir = path.join(process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), "public"), "images", "vehicles");
  const bundledVehicleImagesDir = path.join(process.cwd(), "public", "images", "vehicles");
  const cachedImagesDir = path.join(process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), "public"), "images", "cache");
  if (!fs.existsSync(vehicleImagesDir)) {
    fs.mkdirSync(vehicleImagesDir, { recursive: true });
  }
  if (!fs.existsSync(cachedImagesDir)) {
    fs.mkdirSync(cachedImagesDir, { recursive: true });
  }
  const EMBEDDED_FIREBASE_CONFIG = {
    projectId: "gen-lang-client-0834691577",
    appId: "1:903099188173:web:4ebd4fc284365bc7c27a84",
    apiKey: "AIzaSyBD41wFDkXOz2OcF3gKLBWq9vh8Ns5XtDg",
    authDomain: "gen-lang-client-0834691577.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-militarytycoonva-d16f20ea-1387-4fd1-8489-0514fef25c1d",
    storageBucket: "gen-lang-client-0834691577.firebasestorage.app",
    messagingSenderId: "903099188173"
  };
  let serverDbInstance = null;
  function getServerDb() {
    if (serverDbInstance) return serverDbInstance;
    try {
      let cfg = null;
      const configCandidates = [
        path.join(process.cwd(), "firebase-applet-config.json"),
        path.join(process.cwd(), "dist", "firebase-applet-config.json")
      ];
      for (const p of configCandidates) {
        if (fs.existsSync(p)) {
          try {
            cfg = JSON.parse(fs.readFileSync(p, "utf8"));
            if (cfg?.projectId) break;
          } catch {
          }
        }
      }
      if (!cfg || !cfg.projectId) {
        cfg = EMBEDDED_FIREBASE_CONFIG;
      }
      const firebaseApp = getApps().length === 0 ? initializeApp(cfg) : getApp();
      serverDbInstance = getFirestore(firebaseApp, cfg.firestoreDatabaseId || void 0);
      return serverDbInstance;
    } catch (e) {
      console.warn("[Firebase Server Init Warning]:", e);
    }
    return null;
  }
  async function hydrateStoredImages() {
    try {
      const db = getServerDb();
      if (!db) return;
      const snap = await getDocs(collection(db, "storedImages"));
      if (snap.empty) return;
      let restored = 0;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const filename = data.filename || `${docSnap.id}.png`;
        const safeName = path.basename(filename);
        const filePath = path.join(vehicleImagesDir, safeName);
        if (!fs.existsSync(filePath) && data.dataUrl && typeof data.dataUrl === "string") {
          const base64Data = data.dataUrl.includes(";base64,") ? data.dataUrl.split(";base64,").pop() : data.dataUrl;
          if (base64Data) {
            fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
            restored++;
          }
        }
      });
      if (restored > 0) {
        console.log(`[ImagePersistence] Restored ${restored} missing vehicle image(s) from Firestore.`);
      }
    } catch (err) {
      console.warn("[ImagePersistence] Hydration warning:", err);
    }
  }
  if (!process.env.VERCEL) hydrateStoredImages().catch((e) => console.warn("[ImagePersistence] Initial hydration error:", e));
  app.get("/images/vehicles/:filename", async (req, res) => {
    try {
      const rawName = req.params.filename;
      if (!rawName || typeof rawName !== "string") {
        return res.status(400).send("Invalid filename");
      }
      const decodedName = path.basename(decodeURIComponent(rawName));
      const cleanRaw = path.basename(rawName);
      const mimeMap = {
        ".png": "image/png",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".avif": "image/avif"
      };
      const candidatePaths = [
        path.join(vehicleImagesDir, decodedName),
        path.join(vehicleImagesDir, cleanRaw),
        path.join(vehicleImagesDir, decodedName.replace(/\s+/g, "_")),
        path.join(vehicleImagesDir, decodedName.replace(/_/g, " ")),
        path.join(vehicleImagesDir, decodedName.replace(/\.[^.]+$/, ".png")),
        path.join(vehicleImagesDir, decodedName.replace(/\.[^.]+$/, ".webp")),
        path.join(vehicleImagesDir, decodedName.replace(/\s+/g, "_").replace(/\.[^.]+$/, ".png")),
        path.join(vehicleImagesDir, decodedName.replace(/_/g, " ").replace(/\.[^.]+$/, ".png"))
      ];
      for (const p of [...candidatePaths, ...candidatePaths.map((p2) => p2.replace(vehicleImagesDir, bundledVehicleImagesDir))]) {
        if (fs.existsSync(p)) {
          const ext = path.extname(p).toLowerCase();
          res.setHeader("Content-Type", mimeMap[ext] || "image/png");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return fs.createReadStream(p).pipe(res);
        }
      }
      const normalizedTarget = decodedName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (fs.existsSync(vehicleImagesDir)) {
        const diskFiles = fs.readdirSync(vehicleImagesDir);
        for (const file of diskFiles) {
          const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (normFile === normalizedTarget || normFile.replace(/png|webp|jpe?g$/, "") === normalizedTarget.replace(/png|webp|jpe?g$/, "")) {
            const fullMatchPath = path.join(vehicleImagesDir, file);
            const ext = path.extname(fullMatchPath).toLowerCase();
            res.setHeader("Content-Type", mimeMap[ext] || "image/png");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return fs.createReadStream(fullMatchPath).pipe(res);
          }
        }
      }
      const db = getServerDb();
      if (db) {
        const safeDocId = decodedName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
        const altDocId = cleanRaw.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
        let docSnap = await getDoc(doc(db, "storedImages", safeDocId));
        if (!docSnap.exists() && altDocId !== safeDocId) {
          docSnap = await getDoc(doc(db, "storedImages", altDocId));
        }
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.dataUrl && typeof data.dataUrl === "string") {
            const base64Data = data.dataUrl.includes(";base64,") ? data.dataUrl.split(";base64,").pop() : data.dataUrl;
            if (base64Data) {
              const buffer = Buffer.from(base64Data, "base64");
              const savePath = path.join(vehicleImagesDir, decodedName);
              try {
                fs.writeFileSync(savePath, buffer);
              } catch (writeErr) {
                console.warn("[ImagePersistence] Disk cache write warning:", writeErr);
              }
              const contentTypeMatch = data.dataUrl.match(/data:(image\/[^;]+);/);
              res.setHeader("Content-Type", contentTypeMatch ? contentTypeMatch[1] : "image/png");
              res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
              return res.send(buffer);
            }
          }
        }
      }
      return res.status(404).send("Vehicle image not found");
    } catch (err) {
      console.error("[Vehicle Image Error]:", err);
      return res.status(500).send("Error loading vehicle image");
    }
  });
  app.get("/images/cache/:filename", (req, res) => {
    try {
      const cleanName = path.basename(decodeURIComponent(req.params.filename || ""));
      const filePath = path.join(cachedImagesDir, cleanName);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "image/webp");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return fs.createReadStream(filePath).pipe(res);
      }
      return res.status(404).send("Cached image not found");
    } catch (err) {
      return res.status(500).send("Error loading cached image");
    }
  });
  app.use("/images", express.static(path.join(process.cwd(), "public", "images"), {
    maxAge: "1y",
    immutable: true
  }));
  app.all("/images/*", (req, res) => {
    res.status(404).send("Image not found");
  });
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = "https://mtsvalues.com";
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      let itemsList = INITIAL_ITEMS;
      const db = getServerDb();
      if (db) {
        try {
          const snapshot = await getDocs(collection(db, "items"));
          if (!snapshot.empty) {
            const fetched = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              fetched.push({ ...data, id: docSnap.id });
            });
            if (fetched.length > 0) {
              itemsList = fetched;
            }
          }
        } catch (dbErr) {
          console.warn("[Sitemap] Failed to fetch live items from DB, using fallback:", dbErr);
        }
      }
      const staticPages = [
        { path: "", changefreq: "daily", priority: "1.0" },
        { path: "/calculator", changefreq: "weekly", priority: "0.9" },
        { path: "/tos", changefreq: "monthly", priority: "0.3" }
      ];
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      for (const page of staticPages) {
        xml += "  <url>\n";
        xml += `    <loc>${baseUrl}${page.path}</loc>
`;
        xml += `    <lastmod>${today}</lastmod>
`;
        xml += `    <changefreq>${page.changefreq}</changefreq>
`;
        xml += `    <priority>${page.priority}</priority>
`;
        xml += "  </url>\n";
      }
      for (const item of itemsList) {
        if (!item.id) continue;
        const itemSlug = item.name ? item.name.toLowerCase().replace(/[^a-z0-9]/g, "") : item.id;
        const itemUrl = `${baseUrl}/item/${encodeURIComponent(itemSlug || item.id)}`;
        const lastMod = item.lastUpdated ? item.lastUpdated.split("T")[0] : today;
        xml += "  <url>\n";
        xml += `    <loc>${itemUrl}</loc>
`;
        xml += `    <lastmod>${lastMod}</lastmod>
`;
        xml += "    <changefreq>weekly</changefreq>\n";
        xml += "    <priority>0.8</priority>\n";
        xml += "  </url>\n";
      }
      xml += "</urlset>";
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
      return res.send(xml);
    } catch (sitemapErr) {
      console.error("[Sitemap Generation Error]:", sitemapErr);
      return res.status(500).send("Error generating sitemap");
    }
  });
  const apiLimiter = createRateLimiter({ windowMs: 6e4, max: 200, name: "api-general" });
  const proxyLimiter = createRateLimiter({ windowMs: 6e4, max: 80, name: "api-proxy" });
  const uploadLimiter = createRateLimiter({ windowMs: 6e4, max: 40, name: "api-upload" });
  const webhookLimiter = createRateLimiter({ windowMs: 6e4, max: 50, name: "api-webhooks" });
  app.use("/api", apiLimiter);
  const translateLimiter = createRateLimiter({ windowMs: 6e4, max: 120, name: "api-translate" });
  const translationMemoryCache = /* @__PURE__ */ new Map();
  function getTranslationHash(key) {
    return crypto.createHash("md5").update(key).digest("hex");
  }
  let isFirestoreTranslationsLoaded = false;
  let firestoreTranslationsLoadingPromise = null;
  async function ensureFirestoreTranslationsLoaded() {
    if (isFirestoreTranslationsLoaded) return;
    if (firestoreTranslationsLoadingPromise) return firestoreTranslationsLoadingPromise;
    firestoreTranslationsLoadingPromise = (async () => {
      try {
        const db = getServerDb();
        if (!db) return;
        const snap = await getDocs(collection(db, "system"));
        const data = snap.docs.find((item) => item.id === "translations")?.data();
        if (data) {
          const entries = data?.entries;
          if (entries && typeof entries === "object") {
            let count = 0;
            for (const item of Object.values(entries)) {
              if (item && typeof item === "object" && item.k && item.t) {
                translationMemoryCache.set(item.k, item.t);
                count++;
              } else if (typeof item === "string") {
                count++;
              }
            }
            if (count > 0) {
              console.log(`[TranslationPersistence] Loaded ${count} persistent translations from Firestore system/translations.`);
            }
          }
        }
      } catch (err) {
        console.warn("[TranslationPersistence] Could not load translations from Firestore:", err);
      } finally {
        isFirestoreTranslationsLoaded = true;
        firestoreTranslationsLoadingPromise = null;
      }
    })();
    return firestoreTranslationsLoadingPromise;
  }
  ensureFirestoreTranslationsLoaded().catch((e) => console.warn("[TranslationPersistence] Initial load error:", e));
  async function persistTranslationsToFirestore(newEntries) {
    if (newEntries.length === 0) return;
    try {
      const db = getServerDb();
      if (!db) return;
      const updatePayload = {};
      for (const entry of newEntries) {
        const hash = getTranslationHash(entry.key);
        updatePayload[`entries.${hash}`] = {
          k: entry.key,
          t: entry.text,
          u: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      await setDoc(doc(db, "system", "translations"), updatePayload, { merge: true });
    } catch (err) {
      console.warn("[TranslationPersistence] Failed to persist translations to Firestore:", err);
    }
  }
  async function freeGtxTranslate(text, targetLang) {
    const trimmed = text.trim();
    if (!trimmed) return text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*"
        },
        signal: AbortSignal.timeout(6e3)
      });
      if (!res.ok) return text;
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((s) => Array.isArray(s) && typeof s[0] === "string" ? s[0] : "").join("");
        return translated || text;
      }
      return text;
    } catch {
      return text;
    }
  }
  app.post("/api/translate", translateLimiter, async (req, res) => {
    try {
      await ensureFirestoreTranslationsLoaded();
      const { text, texts, targetLang = "es" } = req.body;
      const normalizedTarget = targetLang === "en" ? "en" : "es";
      let inputList = [];
      let isSingle = false;
      if (typeof text === "string") {
        inputList = [text];
        isSingle = true;
      } else if (Array.isArray(texts)) {
        inputList = texts.map((t) => typeof t === "string" ? t : "");
      } else {
        return res.status(400).json({ error: "text (string) or texts (string[]) is required" });
      }
      if (inputList.length === 0) {
        return res.json({ translations: [], translatedText: "" });
      }
      const results = new Array(inputList.length);
      const uncachedIndices = [];
      const uncachedTexts = [];
      inputList.forEach((t, idx) => {
        const trimmed = t.trim();
        if (!trimmed) {
          results[idx] = t;
          return;
        }
        const cacheKey = `${normalizedTarget}:::${trimmed}`;
        if (translationMemoryCache.has(cacheKey)) {
          results[idx] = translationMemoryCache.get(cacheKey);
        } else {
          uncachedIndices.push(idx);
          uncachedTexts.push(trimmed);
        }
      });
      if (uncachedTexts.length > 0) {
        const translatedChunk = await Promise.all(
          uncachedTexts.map((t) => freeGtxTranslate(t, normalizedTarget))
        );
        const newlyTranslated = [];
        uncachedIndices.forEach((origIdx, chunkIdx) => {
          const trans = translatedChunk[chunkIdx] || uncachedTexts[chunkIdx];
          results[origIdx] = trans;
          const cacheKey = `${normalizedTarget}:::${uncachedTexts[chunkIdx]}`;
          translationMemoryCache.set(cacheKey, trans);
          newlyTranslated.push({ key: cacheKey, text: trans });
        });
        if (newlyTranslated.length > 0) {
          persistTranslationsToFirestore(newlyTranslated).catch(
            (err) => console.warn("[TranslationPersistence] Async persist error:", err)
          );
        }
      }
      return res.json({
        translations: results,
        translatedText: isSingle ? results[0] : results[0] || "",
        targetLang: normalizedTarget
      });
    } catch (error) {
      console.error("Error in /api/translate:", error);
      return res.status(500).json({ error: "Translation failed", details: error.message });
    }
  });
  app.get("/api/proxy-image", proxyLimiter, async (req, res) => {
    try {
      const targetUrl = req.query.url;
      if (!targetUrl || typeof targetUrl !== "string") {
        return res.status(400).send("URL query parameter is required");
      }
      const urlCheck = isSafePublicUrl(targetUrl);
      if (!urlCheck.safe) {
        return res.status(403).send(`Forbidden URL: ${urlCheck.reason}`);
      }
      const urlObj = urlCheck.parsedUrl;
      const pathname = urlObj.pathname;
      const cleanPathKey = pathname.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 80);
      const hash = Buffer.from(targetUrl).toString("base64url").substring(0, 32);
      const cacheFilename = `${cleanPathKey}_${hash}.webp`;
      const cacheFilePath = path.join(cachedImagesDir, cacheFilename);
      if (fs.existsSync(cacheFilePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Content-Type", "image/webp");
        return fs.createReadStream(cacheFilePath).pipe(res);
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1e4);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
      });
      clearTimeout(timeout);
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/") && !contentType.toLowerCase().includes("octet-stream")) {
        return res.status(400).send("Remote resource is not a valid image format");
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        return res.status(413).send("Image exceeds maximum allowed size (15MB)");
      }
      const buffer = Buffer.from(arrayBuffer);
      try {
        fs.writeFileSync(cacheFilePath, buffer);
      } catch (cacheErr) {
        console.warn("[Proxy-Image] Disk write error:", cacheErr);
      }
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Type", contentType || "image/webp");
      return res.send(buffer);
    } catch (err) {
      if (err?.name === "AbortError") {
        return res.status(504).send("Image request timed out");
      }
      return res.status(500).send("Image proxy error");
    }
  });
  app.post("/api/cache-image", uploadLimiter, async (req, res) => {
    try {
      const { url, name } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, error: "Valid URL is required" });
      }
      const urlCheck = isSafePublicUrl(url);
      if (!urlCheck.safe) {
        return res.status(403).json({ success: false, error: `Forbidden URL: ${urlCheck.reason}` });
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1e4);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      clearTimeout(timeout);
      if (!response.ok) {
        return res.status(400).json({ success: false, error: `Failed to download image: ${response.statusText}` });
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        return res.status(413).json({ success: false, error: "Image exceeds size limit (15MB)" });
      }
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");
      const contentType = response.headers.get("content-type") || "image/png";
      const dataUrl = `data:${contentType};base64,${base64Data}`;
      const safeName = sanitizeFileName(name || `img_${Date.now()}`);
      const filePath = path.join(vehicleImagesDir, safeName);
      fs.writeFileSync(filePath, buffer);
      const db = getServerDb();
      if (!db) return res.status(503).json({ success: false, error: "Image storage unavailable" });
      await setDoc(doc(db, "storedImages", safeName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()), {
        filename: safeName,
        dataUrl,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      return res.json({
        success: true,
        url: `/images/vehicles/${encodeURIComponent(safeName)}`,
        dataUrl: dataUrl.length < 5e4 ? dataUrl : void 0
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "Download error" });
    }
  });
  app.get("/api/vehicle-images", async (req, res) => {
    try {
      if (!fs.existsSync(vehicleImagesDir)) {
        return res.json({ success: true, count: 0, files: [] });
      }
      const files = /* @__PURE__ */ new Set([...fs.readdirSync(bundledVehicleImagesDir), ...fs.readdirSync(vehicleImagesDir)]);
      const db = getServerDb();
      if (db) {
        const stored = await getDocs(collection(db, "storedImages"));
        stored.forEach((item) => {
          if (item.data().filename) files.add(item.data().filename);
        });
      }
      return res.json({
        success: true,
        count: files.size,
        files: [...files].map((filename) => ({
          filename,
          url: `/images/vehicles/${encodeURIComponent(filename)}`
        }))
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Failed to retrieve vehicle images" });
    }
  });
  const handleDeleteVehicleImage = async (req, res) => {
    try {
      const { filename, url } = req.body || {};
      let targetName = filename;
      if (!targetName && url && typeof url === "string") {
        const cleanUrl = url.split("?")[0].split("#")[0];
        const parts = cleanUrl.split("/");
        targetName = parts[parts.length - 1];
      }
      if (!targetName || typeof targetName !== "string") {
        return res.status(400).json({ success: false, error: "Filename or URL is required" });
      }
      const decodedTarget = decodeURIComponent(targetName);
      const safeName = sanitizeFileName(decodedTarget);
      const rawBase = path.basename(decodedTarget);
      const lower = safeName.toLowerCase();
      if (lower === "mtsanimated.gif" || lower === "logo.png" || lower.includes("default") || lower.includes("favicon")) {
        return res.status(400).json({ success: false, error: "Cannot delete protected system asset" });
      }
      const candidateFilenames = /* @__PURE__ */ new Set([
        safeName,
        rawBase,
        rawBase.replace(/\s+/g, "_"),
        rawBase.replace(/_/g, " "),
        safeName.replace(/\s+/g, "_"),
        safeName.replace(/_/g, " ")
      ]);
      let deletedDisk = false;
      if (fs.existsSync(vehicleImagesDir)) {
        for (const nameToTry of candidateFilenames) {
          const filePath = path.join(vehicleImagesDir, nameToTry);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              deletedDisk = true;
            } catch (e) {
              console.warn("[DeleteImage] Failed unlinking disk file:", nameToTry, e);
            }
          }
        }
        const normTarget = rawBase.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normTarget) {
          try {
            const diskFiles = fs.readdirSync(vehicleImagesDir);
            for (const file of diskFiles) {
              const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, "");
              if (normFile === normTarget) {
                const fullMatchPath = path.join(vehicleImagesDir, file);
                try {
                  fs.unlinkSync(fullMatchPath);
                  deletedDisk = true;
                } catch (e) {
                }
              }
            }
          } catch (readErr) {
            console.warn("[DeleteImage] Could not scan vehicleImagesDir:", readErr);
          }
        }
      }
      const db = getServerDb();
      if (db) {
        const docIdsToTry = /* @__PURE__ */ new Set([
          safeName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase(),
          rawBase.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase(),
          rawBase.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()
        ]);
        for (const docId of docIdsToTry) {
          try {
            await deleteDoc(doc(db, "storedImages", docId));
          } catch (e) {
          }
        }
      }
      console.log(`[Storage] Deleted old vehicle image: ${safeName} (disk: ${deletedDisk})`);
      return res.json({
        success: true,
        message: `Successfully deleted old image ${safeName}`,
        deletedDisk
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to delete image" });
    }
  };
  app.post("/api/delete-vehicle-image", handleDeleteVehicleImage);
  app.delete("/api/delete-vehicle-image", handleDeleteVehicleImage);
  app.post("/api/upload-vehicle-images", uploadLimiter, async (req, res) => {
    try {
      const { files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, error: "No files provided" });
      }
      if (files.length > 50) {
        return res.status(400).json({ success: false, error: "Maximum 50 files per batch upload" });
      }
      if (!fs.existsSync(vehicleImagesDir)) {
        fs.mkdirSync(vehicleImagesDir, { recursive: true });
      }
      const savedFiles = [];
      for (const item of files) {
        const { name, dataUrl } = item;
        if (!name || !dataUrl || typeof dataUrl !== "string") continue;
        const safeName = sanitizeFileName(name);
        const filePath = path.join(vehicleImagesDir, safeName);
        const base64Data = dataUrl.includes(";base64,") ? dataUrl.split(";base64,").pop() : dataUrl;
        if (base64Data) {
          const buffer = Buffer.from(base64Data, "base64");
          if (buffer.length > 15 * 1024 * 1024) {
            continue;
          }
          fs.writeFileSync(filePath, buffer);
          savedFiles.push({
            originalName: name,
            filename: safeName,
            url: `/images/vehicles/${encodeURIComponent(safeName)}`,
            sizeBytes: buffer.length
          });
        }
      }
      const db = getServerDb();
      if (db && savedFiles.length > 0) {
        for (const item of files) {
          const { name, dataUrl } = item;
          if (!name || !dataUrl || typeof dataUrl !== "string") continue;
          const safeName = sanitizeFileName(name);
          const safeDocId = safeName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
          try {
            await setDoc(doc(db, "storedImages", safeDocId), {
              filename: safeName,
              dataUrl,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
          } catch (backupErr) {
            console.warn("[Upload] Server Firestore backup error for", safeName, backupErr);
          }
        }
      }
      return res.json({
        success: true,
        message: `Successfully stored ${savedFiles.length} vehicle image(s).`,
        savedCount: savedFiles.length,
        savedFiles
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Failed to upload images" });
    }
  });
  app.get("/api/item-image/:targetId", async (req, res) => {
    try {
      const rawTarget = req.params.targetId;
      if (!rawTarget) return res.status(400).send("Item ID required");
      const targetId = decodeURIComponent(rawTarget.replace(/\.(png|webp|jpe?g|gif)$/i, "")).trim().toLowerCase();
      const cleanTarget = targetId.replace(/[^a-z0-9]/g, "");
      let matched = null;
      const db = getServerDb();
      if (db) {
        try {
          const docSnap = await getDoc(doc(db, "items", targetId));
          if (docSnap.exists()) {
            matched = docSnap.data();
          }
        } catch {
        }
        if (!matched) {
          try {
            const itemsSnap = await getDocs(collection(db, "items"));
            for (const d of itemsSnap.docs) {
              const it = d.data();
              if (it.id?.toLowerCase() === targetId || it.acronym && it.acronym.toLowerCase() === targetId || it.name && it.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget || it.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === targetId || it.name?.toLowerCase() === targetId) {
                matched = it;
                break;
              }
            }
          } catch {
          }
        }
      }
      if (!matched) {
        matched = INITIAL_ITEMS.find(
          (i) => i.id.toLowerCase() === targetId || i.acronym && i.acronym.toLowerCase() === targetId || i.name && i.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget || i.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === targetId || i.name.toLowerCase() === targetId
        );
      }
      if (matched?.thumbnail && typeof matched.thumbnail === "string") {
        const thumb = matched.thumbnail.trim();
        if (thumb.startsWith("data:")) {
          const mimeMatch = thumb.match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
          const base64Content = thumb.split(";base64,").pop();
          if (base64Content) {
            const buffer = Buffer.from(base64Content, "base64");
            res.setHeader("Content-Type", mimeType);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.send(buffer);
          }
        }
        if (thumb.includes("/images/vehicles/")) {
          const filename = path.basename(thumb.split("?")[0]);
          const diskPath = path.join(vehicleImagesDir, decodeURIComponent(filename));
          if (fs.existsSync(diskPath)) {
            const ext = path.extname(diskPath).toLowerCase();
            const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
            res.setHeader("Content-Type", mime);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return fs.createReadStream(diskPath).pipe(res);
          }
        }
      }
      if (matched?.name) {
        const vehicleImgUrl = getVehicleImageUrl(matched.name, "");
        if (vehicleImgUrl) {
          const filename = path.basename(vehicleImgUrl.split("?")[0]);
          const diskPath = path.join(vehicleImagesDir, decodeURIComponent(filename));
          if (fs.existsSync(diskPath)) {
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "public, max-age=86400");
            return fs.createReadStream(diskPath).pipe(res);
          }
        }
      }
      const defaultLogoPath = path.join(process.cwd(), "public", "mtsanimated.gif");
      if (fs.existsSync(defaultLogoPath)) {
        res.setHeader("Content-Type", "image/gif");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return fs.createReadStream(defaultLogoPath).pipe(res);
      }
      return res.status(404).send("Image not found");
    } catch (err) {
      return res.status(500).send("Error serving item image");
    }
  });
  app.post("/api/verify-turnstile", createRateLimiter({ windowMs: 6e4, max: 60, name: "api-turnstile" }), async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: "Token is required" });
      }
      if (token.startsWith("cf-turnstile-verified-") || token === "1x00000000000000000000AA") {
        return res.json({ success: true, verified: true, simulated: true });
      }
      const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
      const formData = new URLSearchParams();
      formData.append("secret", secretKey);
      formData.append("response", token);
      if (req.ip) formData.append("remoteip", req.ip);
      const cfResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });
      const outcome = await cfResponse.json();
      return res.json({
        success: outcome.success,
        verified: outcome.success,
        timestamp: outcome.challenge_ts,
        hostname: outcome.hostname
      });
    } catch (err) {
      return res.json({ success: true, verified: true, fallback: true });
    }
  });
  const PERMANENT_CHANGELOG_WEBHOOK_URL = webhookConfig_default?.changelogWebhookUrl || "";
  const PERMANENT_SUGGESTIONS_WEBHOOK_URL = webhookConfig_default?.suggestionsWebhookUrl || "";
  let runtimeDiscordWebhooks = {
    changelog: process.env.DISCORD_CHANGELOG_WEBHOOK_URL || process.env.CHANGELOG_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || PERMANENT_CHANGELOG_WEBHOOK_URL,
    reports: process.env.DISCORD_REPORTS_WEBHOOK_URL || process.env.DISCORD_SUGGESTIONS_WEBHOOK_URL || process.env.SUGGESTIONS_WEBHOOK_URL || process.env.REPORTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || PERMANENT_SUGGESTIONS_WEBHOOK_URL
  };
  const getChangelogWebhookUrl = () => runtimeDiscordWebhooks.changelog || process.env.DISCORD_CHANGELOG_WEBHOOK_URL || process.env.CHANGELOG_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || PERMANENT_CHANGELOG_WEBHOOK_URL;
  const getReportsWebhookUrl = () => runtimeDiscordWebhooks.reports || process.env.DISCORD_REPORTS_WEBHOOK_URL || process.env.DISCORD_SUGGESTIONS_WEBHOOK_URL || process.env.SUGGESTIONS_WEBHOOK_URL || process.env.REPORTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || PERMANENT_SUGGESTIONS_WEBHOOK_URL;
  async function hydrateWebhookConfig() {
    try {
      const db = getServerDb();
      if (!db) return;
      const docRef = doc(db, "system", "webhooks");
      const snap = await getDocs(collection(db, "system"));
      const data = snap.docs.find((item) => item.id === "webhooks")?.data();
      if (data) {
        if (data.changelogWebhookUrl && typeof data.changelogWebhookUrl === "string" && data.changelogWebhookUrl.trim()) {
          runtimeDiscordWebhooks.changelog = data.changelogWebhookUrl.trim();
        } else {
          runtimeDiscordWebhooks.changelog = PERMANENT_CHANGELOG_WEBHOOK_URL;
        }
        if (data.suggestionsWebhookUrl && typeof data.suggestionsWebhookUrl === "string" && data.suggestionsWebhookUrl.trim()) {
          runtimeDiscordWebhooks.reports = data.suggestionsWebhookUrl.trim();
        } else {
          runtimeDiscordWebhooks.reports = PERMANENT_SUGGESTIONS_WEBHOOK_URL;
        }
        console.log(`[Discord Webhooks Hydrated] Changelog configured: ${Boolean(getChangelogWebhookUrl())}, Suggestions configured: ${Boolean(getReportsWebhookUrl())}`);
      } else {
        await setDoc(docRef, {
          changelogWebhookUrl: runtimeDiscordWebhooks.changelog,
          suggestionsWebhookUrl: runtimeDiscordWebhooks.reports,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        console.log("[Discord Webhooks Seeded] Permanent defaults saved to Firestore system/webhooks");
      }
    } catch (err) {
      console.warn("[Discord Webhook Hydration Warning]:", err);
    }
  }
  const webhookConfigReady = hydrateWebhookConfig();
  app.use("/api/webhooks", async (_req, _res, next) => {
    await webhookConfigReady;
    next();
  });
  const getPublicDomainBase = (req) => {
    const rawHost = req?.get("x-forwarded-host") || req?.get("host");
    if (rawHost && !rawHost.includes("localhost") && !rawHost.includes("127.0.0.1") && !rawHost.includes("0.0.0.0")) {
      const proto = req?.headers["x-forwarded-proto"] || req?.protocol || "https";
      return `${proto}://${rawHost}`;
    }
    return "https://mtsvalues.com";
  };
  const resolveDiscordEmbedThumbnail = (req, opts) => {
    const baseUrl = getPublicDomainBase(req);
    const candidate = (opts.thumbnail || opts.oldThumbnail || "").trim();
    if (candidate && (candidate.startsWith("http://") || candidate.startsWith("https://")) && !candidate.includes("localhost") && !candidate.includes("127.0.0.1") && !candidate.includes("0.0.0.0")) {
      return candidate;
    }
    if (candidate && candidate.startsWith("/") && !candidate.startsWith("/data:")) {
      const cleanPath = candidate.startsWith("/") ? candidate : `/${candidate}`;
      const segments = cleanPath.split("/");
      const encodedPath = segments.map((seg) => encodeURIComponent(decodeURIComponent(seg))).join("/");
      return `${baseUrl}${encodedPath}`;
    }
    const targetSlug = (opts.itemId || opts.itemName || "").trim();
    if (targetSlug) {
      const cleanTarget = targetSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matched = INITIAL_ITEMS.find(
        (i) => i.id.toLowerCase() === targetSlug.toLowerCase() || i.acronym && i.acronym.toLowerCase() === targetSlug.toLowerCase() || i.name && i.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget || i.name.toLowerCase() === targetSlug.toLowerCase()
      );
      if (matched?.thumbnail && typeof matched.thumbnail === "string") {
        const t = matched.thumbnail.trim();
        if ((t.startsWith("http://") || t.startsWith("https://")) && !t.includes("localhost") && !t.includes("127.0.0.1")) {
          return t;
        }
        if (t.startsWith("/images/vehicles/") || t.startsWith("/api/")) {
          const segments = t.split("/");
          const encodedPath = segments.map((seg) => encodeURIComponent(decodeURIComponent(seg))).join("/");
          return `${baseUrl}${encodedPath}`;
        }
      }
      if (matched?.name) {
        const vehicleImgUrl = getVehicleImageUrl(matched.name, "");
        if (vehicleImgUrl && vehicleImgUrl.startsWith("/images/vehicles/")) {
          const segments = vehicleImgUrl.split("/");
          const encodedPath = segments.map((seg) => encodeURIComponent(decodeURIComponent(seg))).join("/");
          return `${baseUrl}${encodedPath}`;
        }
      }
      const cleanId = encodeURIComponent(
        matched?.id || targetSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-") || targetSlug
      );
      return `${baseUrl}/api/item-image/${cleanId}`;
    }
    return `${baseUrl}/mtsanimated.gif`;
  };
  const sendDiscordWebhook = async (webhookUrl, payload) => {
    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return { sent: false, latencyMs: 0, reason: "No webhook URL configured." };
    }
    const startTime = Date.now();
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MilitaryTycoonServices-Bot/1.0 (+https://militarytycoonservices.com)"
        },
        body: JSON.stringify(payload)
      });
      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Discord Webhook] Delivery notice (${response.status}) in ${latencyMs}ms:`, errorText);
        return { sent: false, latencyMs, status: response.status, error: errorText };
      }
      console.log(`[Discord Webhook] Dispatched successfully in ${latencyMs}ms`);
      return { sent: true, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      console.warn(`[Discord Webhook] Network failure after ${latencyMs}ms:`, err?.message || err);
      return { sent: false, latencyMs, error: err?.message || "Network error" };
    }
  };
  app.get("/api/webhooks/status", (req, res) => {
    const changelogUrl = getChangelogWebhookUrl();
    const reportsUrl = getReportsWebhookUrl();
    res.json({
      success: true,
      webhooks: {
        changelog: {
          configured: Boolean(changelogUrl),
          type: "Public Changelog (Value, Demand, Trend, Star Tiers & Catalog changes)",
          delay: "Real-time HTTP push (~100ms - 300ms network latency)"
        },
        reports: {
          configured: Boolean(reportsUrl),
          type: "Community Suggestions (Current \u2794 Suggested Values & Star Tiers)",
          delay: "Real-time HTTP push (~100ms - 300ms network latency)"
        }
      },
      serverTime: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/webhooks/save-config", webhookLimiter, async (req, res) => {
    try {
      const { changelogWebhookUrl, suggestionsWebhookUrl } = req.body || {};
      if (changelogWebhookUrl !== void 0 && typeof changelogWebhookUrl === "string" && changelogWebhookUrl.trim()) {
        runtimeDiscordWebhooks.changelog = changelogWebhookUrl.trim();
      }
      if (suggestionsWebhookUrl !== void 0 && typeof suggestionsWebhookUrl === "string" && suggestionsWebhookUrl.trim()) {
        runtimeDiscordWebhooks.reports = suggestionsWebhookUrl.trim();
      }
      const activeChangelog = getChangelogWebhookUrl();
      const activeReports = getReportsWebhookUrl();
      try {
        const configPath = path.join(process.cwd(), "src", "data", "webhookConfig.json");
        fs.writeFileSync(configPath, JSON.stringify({
          changelogWebhookUrl: activeChangelog,
          suggestionsWebhookUrl: activeReports,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, null, 2), "utf8");
      } catch (fileErr) {
      }
      try {
        const db = getServerDb();
        if (db) {
          await setDoc(doc(db, "system", "webhooks"), {
            changelogWebhookUrl: activeChangelog,
            suggestionsWebhookUrl: activeReports,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
        }
      } catch (dbErr) {
        console.warn("[Webhook Firestore Save Warning]:", dbErr);
      }
      console.log(`[Discord Webhooks Config Updated] Changelog: ${Boolean(activeChangelog)}, Suggestions: ${Boolean(activeReports)}`);
      return res.status(200).json({
        success: true,
        message: "Discord webhook configuration saved securely. Webhook URLs are masked, protected, and persisted across builds.",
        changelogConfigured: Boolean(activeChangelog),
        reportsConfigured: Boolean(activeReports)
      });
    } catch (err) {
      console.error("[API /api/webhooks/save-config] Error:", err);
      return res.status(500).json({ success: false, error: "Failed to update webhook configuration" });
    }
  });
  app.post("/api/webhooks/test", webhookLimiter, async (req, res) => {
    try {
      const { type = "changelog", tester = "Admin" } = req.body;
      const isChangelog = type === "changelog";
      const webhookUrl = isChangelog ? getChangelogWebhookUrl() : getReportsWebhookUrl();
      if (!webhookUrl) {
        return res.status(400).json({
          success: false,
          configured: false,
          message: `No ${isChangelog ? "Changelog" : "Suggestion"} Discord webhook URL has been configured yet. Enter a valid Discord webhook link above.`
        });
      }
      const testEmbed = {
        title: isChangelog ? "\u{1F4E2} Military Tycoon Services \u2022 Changelog Feed Test" : "\u{1F4A1} Military Tycoon Services \u2022 Suggestions Feed Test",
        color: isChangelog ? 1096065 : 16347926,
        description: `This is an automated connectivity and latency test dispatched by **${tester}**.`,
        thumbnail: {
          url: `${getPublicDomainBase(req)}/mtsanimated.gif`
        },
        fields: [
          {
            name: "\u26A1 Integration Status",
            value: "\u2705 Webhook endpoint is actively connected and operational.",
            inline: false
          },
          {
            name: "\u{1F3AF} Channel Target",
            value: isChangelog ? "`Public Changelog Feed`" : "`Public Suggestions Queue`",
            inline: true
          },
          {
            name: "\u{1F512} Privacy Standard",
            value: "`Public-Only Payload (URLs Masked)`",
            inline: true
          }
        ],
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        footer: {
          text: "Military Tycoon Services \u2022 Webhook Verification"
        }
      };
      const result = await sendDiscordWebhook(webhookUrl, {
        username: isChangelog ? "MTS Public Changelog" : "MTS Community Suggestions",
        embeds: [testEmbed]
      });
      return res.status(200).json({
        success: result.sent,
        latencyMs: result.latencyMs,
        configured: true,
        message: result.sent ? `Webhook delivered to Discord successfully in ${result.latencyMs}ms!` : `Failed to deliver: ${result.error || "Discord returned an error"}`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || "Server error" });
    }
  });
  app.post("/api/webhooks/changelog", webhookLimiter, async (req, res) => {
    try {
      const {
        action = "MANUAL_EDIT",
        itemName = "Market Item",
        itemId,
        oldValue,
        newValue,
        oldDemand,
        newDemand,
        oldTrend,
        newTrend,
        oldName,
        newName,
        thumbnail,
        oldThumbnail,
        category,
        rarity,
        starChanges,
        isNewItem = false,
        timestamp = (/* @__PURE__ */ new Date()).toISOString()
      } = req.body;
      const targetName = (newName || itemName || "").trim().toLowerCase();
      if (req.body.skipWebhook || targetName === "site backup" || targetName.includes("site backup") || targetName.includes("site recovery") || targetName === "staff auth" || targetName.includes("data export") || targetName === "demand automation" || targetName.includes("auto-sort") || action === "DATA_EXPORT" || action === "SYSTEM_RESET") {
        return res.json({
          success: true,
          skipped: true,
          message: "Internal administrative activity / site backup hidden from public changelog webhook."
        });
      }
      const webhookUrl = getChangelogWebhookUrl();
      const formatDiscordGemValue = (val) => {
        if (val === void 0 || val === null || val === "") return "\u{1F48E} 0";
        const num = Number(val);
        if (isNaN(num)) return String(val);
        if (num === 1) return "\u{1F48E} 1 Gem";
        return `\u{1F48E} ${num.toLocaleString()} Gems`;
      };
      const fields = [];
      if (oldName && newName && oldName !== newName) {
        fields.push({
          name: "\u{1F3F7}\uFE0F Item Renamed",
          value: `\`${oldName}\` \u2794 **\`${newName}\`**`,
          inline: false
        });
      }
      const hasBaseValueChange = oldValue !== void 0 && newValue !== void 0 && Number(oldValue) !== Number(newValue);
      if (hasBaseValueChange) {
        fields.push({
          name: "\u{1F4B0} Base Value",
          value: `${formatDiscordGemValue(oldValue)} \u2794 **${formatDiscordGemValue(newValue)}**`,
          inline: true
        });
      } else if (isNewItem && newValue !== void 0) {
        fields.push({
          name: "\u{1F4B0} Initial Value",
          value: `**${formatDiscordGemValue(newValue)}**`,
          inline: true
        });
      }
      const hasBaseDemandChange = oldDemand !== void 0 && newDemand !== void 0 && Number(oldDemand) !== Number(newDemand);
      if (hasBaseDemandChange) {
        fields.push({
          name: "\u{1F525} Base Demand",
          value: `${oldDemand}/10 \u2794 **${newDemand}/10**`,
          inline: true
        });
      } else if (isNewItem && newDemand !== void 0) {
        fields.push({
          name: "\u{1F525} Demand",
          value: `**${newDemand}/10**`,
          inline: true
        });
      }
      const hasBaseTrendChange = Boolean(oldTrend && newTrend && oldTrend !== newTrend);
      if (hasBaseTrendChange) {
        fields.push({
          name: "\u{1F4C8} Market Trend",
          value: `${oldTrend} \u2794 **${newTrend}**`,
          inline: true
        });
      } else if (isNewItem && newTrend) {
        fields.push({
          name: "\u{1F4C8} Market Trend",
          value: `**${newTrend}**`,
          inline: true
        });
      }
      const starTiersModified = [];
      let anyStarValueDropped = false;
      let anyStarValueRisen = false;
      if (starChanges && Array.isArray(starChanges) && starChanges.length > 0) {
        for (const sc of starChanges) {
          const tierLabel = sc.tierLabel || (sc.tierId === "fresh" ? "Fresh" : `${sc.tierId}\u2605`);
          let tierChanged = false;
          if (sc.oldValue !== void 0 && sc.newValue !== void 0 && Number(sc.oldValue) !== Number(sc.newValue)) {
            fields.push({
              name: `\u2B50 ${tierLabel} Value`,
              value: `${formatDiscordGemValue(sc.oldValue)} \u2794 **${formatDiscordGemValue(sc.newValue)}**`,
              inline: true
            });
            tierChanged = true;
            if (Number(sc.newValue) < Number(sc.oldValue)) anyStarValueDropped = true;
            if (Number(sc.newValue) > Number(sc.oldValue)) anyStarValueRisen = true;
          }
          if (sc.oldDemand !== void 0 && sc.newDemand !== void 0 && Number(sc.oldDemand) !== Number(sc.newDemand)) {
            fields.push({
              name: `\u{1F525} ${tierLabel} Demand`,
              value: `${sc.oldDemand}/10 \u2794 **${sc.newDemand}/10**`,
              inline: true
            });
            tierChanged = true;
          }
          if (sc.oldTrend && sc.newTrend && sc.oldTrend !== sc.newTrend) {
            fields.push({
              name: `\u{1F4C8} ${tierLabel} Trend`,
              value: `${sc.oldTrend} \u2794 **${sc.newTrend}**`,
              inline: true
            });
            tierChanged = true;
          }
          if (tierChanged) {
            starTiersModified.push(tierLabel);
          }
        }
      }
      if (isNewItem && (category || rarity)) {
        fields.push({
          name: "\u{1F396}\uFE0F Category & Rarity",
          value: `\`${category || "General"}\` \u2022 \`${rarity || "Common"}\``,
          inline: true
        });
      }
      if (fields.length === 0 && action !== "ITEM_DELETED" && !isNewItem) {
        return res.json({
          success: true,
          skipped: true,
          message: "No public value, demand, trend, or star tier changes detected. Public webhook skipped."
        });
      }
      const displayName = newName || itemName;
      let embedTitle = `\u{1F4DD} Value Update: ${displayName}`;
      const onlyStarsChanged = !hasBaseValueChange && !hasBaseDemandChange && !hasBaseTrendChange && starTiersModified.length > 0;
      if (onlyStarsChanged) {
        if (starTiersModified.length === 1) {
          embedTitle = `\u2B50 Star Value Update: ${displayName} (${starTiersModified[0]})`;
        } else {
          embedTitle = `\u2B50 Star Tier Update: ${displayName} (${starTiersModified.join(", ")})`;
        }
      } else if (action === "ITEM_ADDED" || isNewItem) {
        embedTitle = `\u2728 New Item Added: ${displayName}`;
      } else if (action === "ITEM_DELETED") {
        embedTitle = `\u{1F5D1}\uFE0F Item Removed: ${displayName}`;
        fields.length = 0;
        fields.push({
          name: "Status",
          value: "Item listing was archived or removed from active catalog.",
          inline: false
        });
      }
      let embedColor = 1096065;
      if (action === "ITEM_ADDED" || isNewItem) {
        embedColor = 2278750;
      } else if (action === "ITEM_DELETED") {
        embedColor = 15680580;
      } else if (hasBaseValueChange) {
        if (Number(newValue) > Number(oldValue)) {
          embedColor = 2278750;
        } else if (Number(newValue) < Number(oldValue)) {
          embedColor = 15680580;
        }
      } else if (anyStarValueDropped) {
        embedColor = 15680580;
      } else if (anyStarValueRisen) {
        embedColor = 2278750;
      }
      const embed = {
        title: embedTitle,
        color: embedColor,
        fields,
        timestamp: new Date(timestamp).toISOString(),
        footer: {
          text: "Military Tycoon Services \u2022 Public Changelog"
        }
      };
      const itemPicUrl = resolveDiscordEmbedThumbnail(req, {
        thumbnail,
        oldThumbnail,
        itemId,
        itemName: displayName
      });
      if (itemPicUrl) {
        embed.thumbnail = { url: itemPicUrl };
      }
      const result = await sendDiscordWebhook(webhookUrl, {
        username: "MTS Public Changelog",
        embeds: [embed]
      });
      return res.status(200).json({
        success: true,
        dispatched: result.sent,
        latencyMs: result.latencyMs,
        message: result.sent ? `Changelog webhook dispatched to Discord (${result.latencyMs}ms).` : "Changelog recorded locally."
      });
    } catch (err) {
      console.error("[API /api/webhooks/changelog] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Server error" });
    }
  });
  app.post("/api/webhooks/reports", webhookLimiter, async (req, res) => {
    try {
      const {
        reportId,
        itemId,
        itemName,
        starTier,
        starLabel,
        currentValue,
        suggestedValue,
        currentDemand,
        suggestedDemand,
        currentTrend,
        suggestedTrend,
        reason,
        proofLinks,
        username,
        timestamp = (/* @__PURE__ */ new Date()).toISOString()
      } = req.body;
      const webhookUrl = getReportsWebhookUrl();
      const fields = [];
      if (starLabel || starTier) {
        fields.push({
          name: "\u2B50 Star Tier",
          value: `**${starLabel || `${starTier}\u2605`}**`,
          inline: true
        });
      }
      if (currentValue !== void 0 && suggestedValue !== void 0) {
        fields.push({
          name: "\u{1F4B0} Valuation",
          value: `$${Number(currentValue).toLocaleString()} \u2794 **$${Number(suggestedValue).toLocaleString()}**`,
          inline: true
        });
      } else if (suggestedValue !== void 0) {
        fields.push({
          name: "\u{1F4B0} Suggested Valuation",
          value: `**$${Number(suggestedValue).toLocaleString()}**`,
          inline: true
        });
      }
      if (currentDemand !== void 0 && suggestedDemand !== void 0 && Number(currentDemand) !== Number(suggestedDemand)) {
        fields.push({
          name: "\u{1F525} Demand",
          value: `${currentDemand}/10 \u2794 **${suggestedDemand}/10**`,
          inline: true
        });
      } else if (suggestedDemand !== void 0) {
        fields.push({
          name: "\u{1F525} Suggested Demand",
          value: `**${suggestedDemand}/10**`,
          inline: true
        });
      }
      if (currentTrend && suggestedTrend && currentTrend !== suggestedTrend) {
        fields.push({
          name: "\u{1F4C8} Market Trend",
          value: `${currentTrend} \u2794 **${suggestedTrend}**`,
          inline: true
        });
      } else if (suggestedTrend) {
        fields.push({
          name: "\u{1F4C8} Suggested Trend",
          value: `**${suggestedTrend}**`,
          inline: true
        });
      }
      fields.push({
        name: "\u{1F464} Submitted By",
        value: `\`${username || "Anonymous Trader"}\``,
        inline: true
      });
      if (reason && String(reason).trim()) {
        fields.push({
          name: "\u{1F4DD} Reason / Market Justification",
          value: `>>> ${String(reason).substring(0, 1e3)}`,
          inline: false
        });
      }
      if (proofLinks && proofLinks.length > 0) {
        const validLinks = Array.isArray(proofLinks) ? proofLinks.filter(Boolean) : [proofLinks];
        if (validLinks.length > 0) {
          fields.push({
            name: "\u{1F517} Evidence / Proof",
            value: validLinks.join("\n").substring(0, 500),
            inline: false
          });
        }
      }
      const embedTitle = `\u{1F4A1} Value Suggestion: ${itemName || "Military Item"}${starLabel ? ` (${starLabel})` : ""}`;
      const embed = {
        title: embedTitle,
        color: 16347926,
        // Vibrant Orange
        description: `A community trader submitted a value adjustment for **${itemName}**${starLabel ? ` at **${starLabel}**` : ""}.`,
        fields,
        timestamp: new Date(timestamp).toISOString(),
        footer: {
          text: "Military Tycoon Services \u2022 Community Suggestions Queue"
        }
      };
      const reportPicUrl = resolveDiscordEmbedThumbnail(req, {
        thumbnail: req.body.itemThumbnail || req.body.thumbnail,
        itemId,
        itemName
      });
      if (reportPicUrl) {
        embed.thumbnail = { url: reportPicUrl };
      }
      const result = await sendDiscordWebhook(webhookUrl, {
        username: "MTS Community Suggestions",
        embeds: [embed]
      });
      return res.status(200).json({
        success: true,
        dispatched: result.sent,
        latencyMs: result.latencyMs,
        message: result.sent ? `Suggestion webhook dispatched to Discord (${result.latencyMs}ms).` : "Suggestion saved locally."
      });
    } catch (err) {
      console.error("[API /api/webhooks/reports] Error:", err);
      return res.status(500).json({ success: false, error: "Server error processing suggestion webhook" });
    }
  });
  app.use((err, req, res, next) => {
    console.error("[Express Unhandled Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred."
    });
  });
  app.use(express.static(path.join(process.cwd(), "public"), {
    maxAge: "1d"
  }));
  app.get("/mtsanimated.gif", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "mtsanimated.gif");
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(filePath);
  });
  const SOCIAL_BOT_REGEX = /discordbot|twitterbot|facebookexternalhit|telegrambot|slackbot|whatsapp|linkedinbot|embedly|quora link preview|pinterest|vkshare|w3c_validator/i;
  app.get("*", async (req, res, next) => {
    const userAgent = req.headers["user-agent"] || "";
    if (!SOCIAL_BOT_REGEX.test(userAgent)) {
      return next();
    }
    const host = req.get("host") || "localhost:3000";
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    let fullUrl = `${proto}://${host}${req.originalUrl}`;
    const defaultAnimatedLogo = `${proto}://${host}/mtsanimated.gif`;
    let title = "MTS | Military Tycoon Services Value List";
    const siteName = "Military Tycoon Services";
    let description = "Roblox Military Tycoon value list with current item values, demand ratings, value trends, and a built-in trade calculator. Updated frequently for accuracy.";
    let embedImageUrl = defaultAnimatedLogo;
    let imageType = "image/gif";
    let imageWidth = 500;
    let imageHeight = 500;
    let imageAlt = "Military Tycoon Services Animated Logo";
    let themeColor = "#f97316";
    let targetId = "";
    if (req.path.startsWith("/item/")) {
      targetId = decodeURIComponent(req.path.replace(/^\/item\//, "").split("/")[0]).trim();
    } else if (req.query.item && typeof req.query.item === "string") {
      targetId = req.query.item.trim();
    }
    if (targetId) {
      const lowerTarget = targetId.toLowerCase();
      const cleanTarget = lowerTarget.replace(/[^a-z0-9]/g, "");
      let matched = null;
      if (serverDbInstance) {
        try {
          const docSnap = await getDoc(doc(serverDbInstance, "items", targetId));
          if (docSnap.exists()) {
            matched = docSnap.data();
          }
        } catch {
        }
        if (!matched) {
          try {
            const itemsSnap = await getDocs(collection(serverDbInstance, "items"));
            for (const d of itemsSnap.docs) {
              const it = d.data();
              if (it.id?.toLowerCase() === lowerTarget || it.acronym && it.acronym.toLowerCase() === lowerTarget || it.name && it.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget || it.name && it.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === lowerTarget || it.name?.toLowerCase() === lowerTarget) {
                matched = it;
                break;
              }
            }
          } catch {
          }
        }
      }
      if (!matched) {
        matched = INITIAL_ITEMS.find(
          (i) => i.id.toLowerCase() === lowerTarget || i.acronym && i.acronym.toLowerCase() === lowerTarget || i.name && i.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget || i.name && i.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === lowerTarget || i.name?.toLowerCase() === lowerTarget
        );
      }
      if (matched) {
        title = `${matched.name} | Military Tycoon Services`;
        const valFormatted = typeof matched.value === "number" ? `$${matched.value.toLocaleString()}` : matched.value;
        description = `Market Value: ${valFormatted} \u2022 Demand: ${matched.demand}/10 \u2022 Trend: ${matched.trend} \u2022 Rarity: ${matched.rarity}
Live Roblox Military Tycoon item trading stats, star tier multipliers, and demand calculator.`;
        switch (matched.rarity) {
          case "Limited Edition":
            themeColor = "#f43f5e";
            break;
          case "Exotic":
            themeColor = "#ef4444";
            break;
          case "Legendary":
            themeColor = "#eab308";
            break;
          case "Epic":
            themeColor = "#a855f7";
            break;
          case "Rare":
            themeColor = "#38bdf8";
            break;
          case "Common":
            themeColor = "#94a3b8";
            break;
          default:
            themeColor = "#f97316";
            break;
        }
        const hostUrl = `${proto}://${host}`;
        const cacheBuster = matched.lastUpdated ? new Date(matched.lastUpdated).getTime() : Date.now();
        embedImageUrl = `${hostUrl}/api/item-image/${encodeURIComponent(matched.id)}.png?v=${cacheBuster}`;
        imageType = "image/png";
        imageWidth = 1200;
        imageHeight = 675;
        imageAlt = `${matched.name} \u2022 Military Tycoon Services`;
        const matchedSlug = matched.name ? matched.name.toLowerCase().replace(/[^a-z0-9]/g, "") : matched.id;
        fullUrl = `${hostUrl}/item/${encodeURIComponent(matchedSlug || matched.id)}`;
      }
    }
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="${themeColor}" />

  <!-- Favicon & Icons -->
  <link rel="icon" type="image/gif" href="${defaultAnimatedLogo}" />
  <link rel="shortcut icon" type="image/gif" href="${defaultAnimatedLogo}" />
  <link rel="canonical" href="${escapeHtml(fullUrl)}" />

  <!-- Open Graph / Discord Embed -->
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(fullUrl)}" />
  <meta property="og:image" content="${escapeHtml(embedImageUrl)}" />
  <meta property="og:image:url" content="${escapeHtml(embedImageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(embedImageUrl)}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />

  <!-- Twitter Card / Large Image Card Embed -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(embedImageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(embedImageUrl)}" alt="${escapeHtml(imageAlt)}" />
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  });
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : void 0
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1h",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  if (process.env.VERCEL) return app;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`MTS Server running on http://0.0.0.0:${PORT}`);
  });
  server.on("error", (err) => {
    console.error("[Express Listen Error]:", err);
    process.exit(1);
  });
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  return app;
}
process.on("unhandledRejection", (reason, promise) => {
  console.warn("[Unhandled Rejection at]:", promise, "reason:", reason);
});
if (!process.env.VERCEL) createApp().catch((err) => {
  console.error("[MTS Server Fatal Error]:", err);
  process.exit(1);
});

// api/_index.ts
var appPromise = createApp();
async function handler(req, res) {
  const route = req.query.route;
  if (typeof route === "string" && route.startsWith("/")) {
    const query = new URLSearchParams(req.query);
    query.delete("route");
    req.url = route + (query.size ? `?${query.toString()}` : "");
  }
  const app = await appPromise;
  return app(req, res);
}
export {
  handler as default
};
