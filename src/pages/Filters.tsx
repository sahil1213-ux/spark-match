import { useEffect, useState } from 'react';
import { AdvancedFilters, getAdvancedFilters, saveAdvancedFilters } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const defaultFilters: AdvancedFilters = {
  ageMin: 18,
  ageMax: 99,
  gender: 'Any',
  city: '',
  distanceKm: 25,
  relationshipGoal: 'open to anything',
  wantsChildren: 'unsure',
  hasChildren: 'no',
  smoking: 'prefer not to say',
  drinking: 'prefer not to say',
  exerciseFrequency: 'rarely',
  sleepHabits: 'flexible',
  eatingPreference: 'omnivore',
  heightMin: 150,
  heightMax: 200,
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
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-3 block">{title}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-2xl px-3 py-2.5 text-sm font-medium capitalize transition-all ${
              value === option
                ? 'gradient-coral text-primary-foreground'
                : 'bg-secondary text-secondary-foreground border border-border'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Filters() {
  const [filters, setFilters] = useState<AdvancedFilters>(defaultFilters);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await getAdvancedFilters();
        setFilters(saved);
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
      toast.success('Filters applied');
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
              <span className="text-sm text-muted-foreground">{filters.ageMin} – {filters.ageMax}</span>
            </div>
            <Slider
              value={[filters.ageMin, filters.ageMax]}
              onValueChange={(v) => setFilters((f) => ({ ...f, ageMin: v[0], ageMax: v[1] }))}
              min={18}
              max={80}
              step={1}
              minStepsBetweenThumbs={1}
            />
          </div>

          <OptionGroup
            title="Preferred Gender"
            options={['Male', 'Female', 'Any'] as const}
            value={filters.gender}
            onChange={(gender) => setFilters((f) => ({ ...f, gender }))}
          />

          <div>
            <label className="text-sm font-medium mb-2 block">Location</label>
            <input
              className="w-full rounded-2xl border bg-background px-3 py-2.5 mb-3"
              placeholder="Current city / town"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            />
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

          <OptionGroup
            title="Relationship Intent"
            options={['short-term', 'long-term', 'friends', 'open to anything'] as const}
            value={filters.relationshipGoal}
            onChange={(relationshipGoal) => setFilters((f) => ({ ...f, relationshipGoal }))}
          />

          <OptionGroup
            title="Do you want children?"
            options={['yes', 'no', 'unsure'] as const}
            value={filters.wantsChildren}
            onChange={(wantsChildren) => setFilters((f) => ({ ...f, wantsChildren }))}
          />

          <OptionGroup
            title="Do you have children?"
            options={['yes', 'no'] as const}
            value={filters.hasChildren}
            onChange={(hasChildren) => setFilters((f) => ({ ...f, hasChildren }))}
          />

          <OptionGroup
            title="Smoke"
            options={['yes', 'no', 'prefer not to say'] as const}
            value={filters.smoking}
            onChange={(smoking) => setFilters((f) => ({ ...f, smoking }))}
          />

          <OptionGroup
            title="Drink"
            options={['yes', 'no', 'prefer not to say'] as const}
            value={filters.drinking}
            onChange={(drinking) => setFilters((f) => ({ ...f, drinking }))}
          />

          <OptionGroup
            title="Exercise"
            options={['never', 'rarely', 'daily'] as const}
            value={filters.exerciseFrequency}
            onChange={(exerciseFrequency) => setFilters((f) => ({ ...f, exerciseFrequency }))}
          />

          <OptionGroup
            title="Sleep habits"
            options={['early bird', 'night owl', 'flexible'] as const}
            value={filters.sleepHabits}
            onChange={(sleepHabits) => setFilters((f) => ({ ...f, sleepHabits }))}
          />

          <OptionGroup
            title="Eating preference"
            options={['omnivore', 'vegetarian', 'vegan'] as const}
            value={filters.eatingPreference}
            onChange={(eatingPreference) => setFilters((f) => ({ ...f, eatingPreference }))}
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Height</label>
              <span className="text-sm text-muted-foreground">{filters.heightMin} – {filters.heightMax} cm</span>
            </div>
            <Slider
              value={[filters.heightMin, filters.heightMax]}
              onValueChange={(v) => setFilters((f) => ({ ...f, heightMin: v[0], heightMax: v[1] }))}
              min={130}
              max={220}
              step={1}
              minStepsBetweenThumbs={1}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Occupation</label>
            <input
              className="w-full rounded-2xl border bg-background px-3 py-2.5"
              placeholder="e.g. Designer, Engineer"
              value={filters.occupation}
              onChange={(e) => setFilters((f) => ({ ...f, occupation: e.target.value }))}
            />
          </div>
        </div>

        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full h-12 rounded-2xl gradient-coral text-primary-foreground font-semibold text-base mt-6"
        >
          {saving ? 'Applying...' : 'Apply Filters'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
