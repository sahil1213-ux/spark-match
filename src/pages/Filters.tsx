import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdvancedFilters, getAdvancedFilters, saveAdvancedFilters } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const defaultFilters: AdvancedFilters = {
  ageMin: null,
  ageMax: null,
  gender: null,
  distanceKm: 25,
  relationshipGoal: null,
  smoking: null,
  drinking: null,
  eatingPreference: null,
  wantsChildren: null,
  hasChildren: null,
  exerciseFrequency: null,
  sleepHabits: null,
  heightMin: null,
  heightMax: null,
  occupation: '',
};

function OptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{title}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(selected ? null : option)}
              className={`rounded-2xl px-3 py-2.5 text-sm font-medium capitalize transition-all ${
                selected
                  ? 'gradient-coral text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground border border-border'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {!value && <p className="mt-1 text-xs text-muted-foreground">Not selected</p>}
    </div>
  );
}

export default function Filters() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AdvancedFilters>(defaultFilters);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await getAdvancedFilters();
        setFilters({ ...defaultFilters, ...saved });
      } catch (error) {
        console.error('Failed to load filters', error);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdvancedFilters(filters);
      toast.success('Filters applied. Refreshing recommendations...');
      navigate('/home', { replace: true, state: { forceRefresh: true } });
    } catch (error) {
      console.error('Failed to save filters', error);
      toast.error('Could not apply filters. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-5 pt-6">
        <h1 className="text-2xl font-heading font-bold mb-6">Filters</h1>

        <div className="space-y-6 rounded-3xl bg-card/70 p-4 border">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Age Range</label>
              <span className="text-sm text-muted-foreground">
                {filters.ageMin == null || filters.ageMax == null ? 'Any' : `${filters.ageMin} – ${filters.ageMax}`}
              </span>
            </div>
            <Slider
              value={[filters.ageMin ?? 18, filters.ageMax ?? 99]}
              onValueChange={(v) => setFilters((f) => ({ ...f, ageMin: v[0], ageMax: v[1] }))}
              min={18}
              max={80}
              step={1}
              minStepsBetweenThumbs={1}
            />
          </div>

          <OptionGroup title="Preferred Gender" options={['Male', 'Female', 'Any'] as const} value={filters.gender} onChange={(gender) => setFilters((f) => ({ ...f, gender }))} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Distance range</span>
              <span className="text-xs text-muted-foreground">Within {filters.distanceKm} km</span>
            </div>
            <Slider
              value={[filters.distanceKm]}
              onValueChange={(v) => setFilters((f) => ({ ...f, distanceKm: v[0] }))}
              min={5}
              max={100}
              step={5}
            />
          </div>

          <OptionGroup title="Relationship Intent" options={['short-term', 'long-term', 'friends', 'open to anything'] as const} value={filters.relationshipGoal} onChange={(relationshipGoal) => setFilters((f) => ({ ...f, relationshipGoal }))} />
          <OptionGroup title="Smoke" options={['yes', 'no', 'prefer not to say'] as const} value={filters.smoking} onChange={(smoking) => setFilters((f) => ({ ...f, smoking }))} />
          <OptionGroup title="Drink" options={['yes', 'no', 'prefer not to say'] as const} value={filters.drinking} onChange={(drinking) => setFilters((f) => ({ ...f, drinking }))} />
          <OptionGroup title="Eating preference" options={['omnivore', 'vegetarian', 'vegan'] as const} value={filters.eatingPreference} onChange={(eatingPreference) => setFilters((f) => ({ ...f, eatingPreference }))} />
        </div>

        <Button onClick={() => void handleSave()} disabled={saving} className="w-full h-12 rounded-2xl gradient-coral text-primary-foreground font-semibold text-base mt-6">
          {saving ? 'Applying...' : 'Apply Filters'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
