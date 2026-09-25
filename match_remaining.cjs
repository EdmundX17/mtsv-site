const fs = require('fs');
const unassigned = [
  'Typhoon.webp', 'B-17.webp', 'V22.webp', 'YF-23.webp', 'Spitfire.webp', 
  'Toy B-17.webp', 'AC130.webp', 'Zombie AC130.webp', 'Super YF-23.webp', 
  'SU57.webp', 'SU25.webp', 'Rafale.webp', 'Snowmobile.webp', 'Humvee.webp', 
  'Himars.webp', 'Jeep.webp', 'Grapple ATV.webp', 'QN506.webp', 'Sea Tank.webp', 
  'BOSS Stormer.webp', 'Rocket Truck.webp'
];

const items = JSON.parse(fs.readFileSync("./items_list.json", "utf8"));
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

unassigned.forEach(u => {
  const base = u.replace(/\.webp$/i, "").trim();
  const n = normalize(base);
  const matches = items.filter(i => {
    const inorm = normalize(i.name);
    return inorm === n || inorm.includes(n) || n.includes(inorm);
  });
  console.log(`Image: "${u}" (norm: ${n}) -> DB matches:`, matches.map(m => `${m.name} [${m.category}]`));
});
