import React from 'react';
import { useValueList } from '../context/ValueListContext';
import { ItemCategory } from '../types';
import { Plane, Shield, Anchor, Crosshair, Tag, Layers, Cpu } from 'lucide-react';

const CATEGORIES: Array<{ id: ItemCategory | 'All'; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'All', label: 'All Items', icon: Layers },
  { id: 'Air', label: 'Air', icon: Plane },
  { id: 'Land', label: 'Land', icon: Shield },
  { id: 'Naval', label: 'Naval', icon: Anchor },
  { id: 'Soldier', label: 'Soldiers', icon: Crosshair },
  { id: 'Drone', label: 'Drones', icon: Cpu },
  { id: 'Tags', label: 'Tags & Cosmetics', icon: Tag },
];

export const CategoryNav: React.FC = () => {
  const { selectedCategory, setSelectedCategory, items, translateCategory } = useValueList();

  const getCategoryCount = (cat: ItemCategory | 'All') => {
    if (cat === 'All') return items.length;
    if (cat === 'Naval') {
      return items.filter(i => i.category === 'Naval' || i.category === 'Sea').length;
    }
    return items.filter(i => i.category === cat).length;
  };

  return (
    <div className="w-full overflow-x-auto py-2 scrollbar-none">
      <div className="flex items-center gap-2 min-w-max pb-1">
        {CATEGORIES.map(({ id, label, icon: Icon }) => {
          const isSelected = selectedCategory === id;
          const count = getCategoryCount(id);

          return (
            <button
              key={id}
              onClick={() => setSelectedCategory(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer border ${
                isSelected
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 font-semibold scale-105'
                  : 'bg-white/80 dark:bg-[#161b22]/80 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border-neutral-200 dark:border-[#30363d] hover:border-orange-300 dark:hover:border-neutral-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`} />
              <span>{id === 'All' ? label : translateCategory(id)}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-white/20 text-white font-bold'
                    : 'bg-neutral-100 dark:bg-[#21262d] text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
