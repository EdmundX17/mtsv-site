import { SiteInfoConfig } from '../types';

export const DEFAULT_SITE_INFO: SiteInfoConfig = {
  title: 'About Military Tycoon Services',
  description: `Thank you for choosing MTS!

Military Tycoon Services is an unofficial Discord server that helps players make trades, as well as provide an accurate list of EVERY item in the game. We have a team of around 11 people who are constantly changing and updating values for other players to enjoy.

The first unofficial value list was created in October of 2024, and has continuously been adjusted since then. We still have a long journey ahead of us, and we appreciate all of you for your support.

If you have any questions, or need assistance with your trades, please join our Discord server at discord.gg/mtservice`,
  announcement: '📢 Values and star tier formulas are maintained and verified daily by our accredited MTS valuation staff team.',
  bulletPoints: [
    '💎 Accurate Gem valuations with live demand trends (1-10 scale)',
    '⭐ Vehicle Star-Tier (0★ to 5★ + Fresh) multipliers & custom combat stats',
    '🛡️ Open player price reporting with transparent staff audit logs'
  ],
  discordUrl: 'https://discord.gg/yenZH7FaXU',
  robloxGroupUrl: undefined,
  teamMembers: [
    {
      id: 'team-1',
      name: 'VoidDarkReaper',
      role: 'Project Lead & Founder',
      discord: 'void_dark',
      robloxUsername: 'VoidDarkReaper',
      bio: 'Leading database architecture and game asset valuations.',
      badgeColor: 'orange'
    },
    {
      id: 'team-2',
      name: 'Commander_Rex',
      role: 'Head Valuer & Admin',
      discord: 'rex_mts',
      robloxUsername: 'Commander_Rex',
      bio: 'Oversees market trend analysis, vehicle demand metrics, and trade verification.',
      badgeColor: 'purple'
    },
    {
      id: 'team-3',
      name: 'SkyHawk_Air',
      role: 'Lead Aircraft Specialist',
      discord: 'skyhawk_air',
      robloxUsername: 'SkyHawk_Air',
      bio: 'Specialist in combat jet pricing, bombers, and limited edition aerial craft.',
      badgeColor: 'blue'
    },
    {
      id: 'team-4',
      name: 'FleetAdmiral_J',
      role: 'Naval Operations Analyst',
      discord: 'admiral_j',
      robloxUsername: 'FleetAdmiral_J',
      bio: 'Tracks battleships, carriers, submarines, and naval tier systems.',
      badgeColor: 'emerald'
    }
  ]
};

