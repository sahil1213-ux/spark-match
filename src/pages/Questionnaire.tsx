import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, getCurrentUserProfile, saveQuestionnaire } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { computePersonalityScores, derivePersona, TRAITS, TraitKey } from '@/lib/scoring';

const likertQuestions: { trait: TraitKey; text: string }[] = [
  { trait: 'openness', text: 'I enjoy trying new activities.' },
  { trait: 'openness', text: 'I seek creative experiences.' },
  { trait: 'openness', text: 'I prefer variety over routine.' },
  { trait: 'conscientiousness', text: 'I plan ahead.' },
  { trait: 'conscientiousness', text: 'I finish what I start.' },
  { trait: 'conscientiousness', text: 'I stay organized.' },
  { trait: 'extraversion', text: 'I feel energized around people.' },
  { trait: 'extraversion', text: 'I enjoy social events.' },
  { trait: 'extraversion', text: 'I like meeting new people.' },
  { trait: 'agreeableness', text: "I care about others' feelings." },
  { trait: 'agreeableness', text: 'I enjoy helping people.' },
  { trait: 'agreeableness', text: 'I try to avoid conflicts.' },
  { trait: 'neuroticism', text: 'I worry often.' },
  { trait: 'neuroticism', text: 'I feel stressed easily.' },
  { trait: 'neuroticism', text: 'I get anxious in new situations.' },
];

const partnerPriorities: Array<{ trait: TraitKey; emoji: string; title: string; subtitle: string }> = [
  { trait: 'openness', emoji: '🌈', title: 'Loves trying new things', subtitle: 'Creative, curious, and open-minded' },
  { trait: 'conscientiousness', emoji: '📋', title: 'Has their life sorted', subtitle: 'Responsible, disciplined, and dependable' },
  { trait: 'extraversion', emoji: '🎉', title: 'Fun & social', subtitle: 'Outgoing, talkative, and full of energy' },
  { trait: 'agreeableness', emoji: '🤝', title: 'Kind-hearted', subtitle: 'Supportive, caring, and emotionally mature' },
  { trait: 'neuroticism', emoji: '🧘', title: 'Emotionally steady', subtitle: 'Calm, stable, and handles stress well' },
];

const LIKERT = [1, 2, 3, 4, 5];
const TOTAL_STEPS = 5;

export default function Questionnaire() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [nonNegotiableTrait, setNonNegotiableTrait] = useState<TraitKey>('openness');

  const [city, setCity] = useState('');
  const [relationshipGoal, setRelationshipGoal] = useState<'short-term' | 'long-term' | 'friends' | 'open to anything'>('open to anything');
  const [wantsChildren, setWantsChildren] = useState<'yes' | 'no' | 'unsure'>('unsure');
  const [hasChildren, setHasChildren] = useState<'yes' | 'no'>('no');
  const [smoking, setSmoking] = useState<'yes' | 'no' | 'prefer not to say'>('prefer not to say');
  const [drinking, setDrinking] = useState<'yes' | 'no' | 'prefer not to say'>('prefer not to say');
  const [exerciseFrequency, setExerciseFrequency] = useState<'never' | 'rarely' | 'daily'>('rarely');
  const [sleepHabits, setSleepHabits] = useState<'early bird' | 'night owl' | 'flexible'>('flexible');
  const [eatingPreference, setEatingPreference] = useState<'omnivore' | 'vegetarian' | 'vegan'>('omnivore');
  const [occupation, setOccupation] = useState('');
  const [height, setHeight] = useState('');

  const setAnswer = (idx: number, val: number) => setAnswers((a) => ({ ...a, [idx]: val }));

  const priorityOrder = useMemo(
    () => [nonNegotiableTrait, ...TRAITS.filter((trait) => trait !== nonNegotiableTrait)],
    [nonNegotiableTrait],
  );

  const liveScores = useMemo(() => {
    const rawAnswers: Record<TraitKey, number[]> = {
      openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [],
    };

    likertQuestions.forEach((q, i) => {
      rawAnswers[q.trait].push(answers[i] ?? 3);
    });

    return computePersonalityScores(rawAnswers);
  }, [answers]);

  const personaLabel = useMemo(() => derivePersona(liveScores), [liveScores]);

  const canNext = () => {
    if (step >= 1 && step <= 3) {
      const start = (step - 1) * 5;
      const end = Math.min(start + 5, likertQuestions.length);
      return Array.from({ length: end - start }, (_, i) => start + i).every((i) => answers[i] !== undefined);
    }

    if (step === 4) {
      return city.trim().length > 0 && occupation.trim().length > 0 && height.trim().length > 0;
    }

    return Boolean(nonNegotiableTrait);
  };

  const finish = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const profile = await getCurrentUserProfile();
    if (!profile) return;

    const rawAnswers: Record<TraitKey, number[]> = {
      openness: [],
      conscientiousness: [],
      extraversion: [],
      agreeableness: [],
      neuroticism: [],
    };

    likertQuestions.forEach((q, i) => {
      rawAnswers[q.trait].push(answers[i] ?? 3);
    });

    const scores = computePersonalityScores(rawAnswers);

    await saveQuestionnaire(userId, {
      bio: profile.bio,
      age: profile.age,
      gender: profile.gender,
      lat: profile.location?.latitude ?? 0,
      lon: profile.location?.longitude ?? 0,
      scores,
      priorityOrder,
      minAge: 18,
      maxAge: 99,
      city,
      relationshipGoal,
      wantsChildren,
      hasChildren,
      smoking,
      drinking,
      exerciseFrequency,
      sleepHabits,
      eatingPreference,
      occupation,
      height,
    });

    navigate('/photos');
  };

  const next = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else void finish();
  };

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col">
      <div className="max-w-sm mx-auto px-6 py-8 flex-1 flex flex-col">
        {step >= 1 && step <= 3 && (() => {
          const start = (step - 1) * 5;
          const end = Math.min(start + 5, likertQuestions.length);
          const page = likertQuestions.slice(start, end);
          return (
            <>
              <h2 className="text-2xl font-heading font-bold mb-6">Personality ({step}/3)</h2>
              <div className="space-y-5 flex-1">
                {page.map((q, i) => {
                  const idx = start + i;
                  return (
                    <div key={idx}>
                      <p className="text-sm font-medium mb-2">{q.text}</p>
                      <div className="flex gap-2">
                        {LIKERT.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAnswer(idx, v)}
                            className={`w-10 h-10 rounded-full text-sm font-bold ${answers[idx] === v ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {step === 4 && (
          <>
            <h2 className="text-2xl font-heading font-bold mb-4">Lifestyle & Preferences</h2>
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-sm font-medium mb-1">Current city / town</p>
                <input className="w-full rounded-xl border bg-card p-3" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">What are you looking for?</p>
                <select className="w-full rounded-xl border bg-card p-3" value={relationshipGoal} onChange={(e) => setRelationshipGoal(e.target.value as typeof relationshipGoal)}>
                  <option value="short-term">short-term</option>
                  <option value="long-term">long-term</option>
                  <option value="friends">friends</option>
                  <option value="open to anything">open to anything</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Do you want children in the future?</p>
                <select className="w-full rounded-xl border bg-card p-3" value={wantsChildren} onChange={(e) => setWantsChildren(e.target.value as typeof wantsChildren)}>
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                  <option value="unsure">unsure</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Do you have children?</p>
                <select className="w-full rounded-xl border bg-card p-3" value={hasChildren} onChange={(e) => setHasChildren(e.target.value as typeof hasChildren)}>
                  <option value="no">no</option>
                  <option value="yes">yes</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Do you smoke?</p>
                <select className="w-full rounded-xl border bg-card p-3" value={smoking} onChange={(e) => setSmoking(e.target.value as typeof smoking)}>
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                  <option value="prefer not to say">prefer not to say</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Do you drink?</p>
                <select className="w-full rounded-xl border bg-card p-3" value={drinking} onChange={(e) => setDrinking(e.target.value as typeof drinking)}>
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                  <option value="prefer not to say">prefer not to say</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">How often do you exercise?</p>
                <select className="w-full rounded-xl border bg-card p-3" value={exerciseFrequency} onChange={(e) => setExerciseFrequency(e.target.value as typeof exerciseFrequency)}>
                  <option value="never">never</option>
                  <option value="rarely">rarely</option>
                  <option value="daily">daily</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Sleep habits</p>
                <select className="w-full rounded-xl border bg-card p-3" value={sleepHabits} onChange={(e) => setSleepHabits(e.target.value as typeof sleepHabits)}>
                  <option value="early bird">early bird</option>
                  <option value="night owl">night owl</option>
                  <option value="flexible">flexible</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Eating preferences</p>
                <select className="w-full rounded-xl border bg-card p-3" value={eatingPreference} onChange={(e) => setEatingPreference(e.target.value as typeof eatingPreference)}>
                  <option value="omnivore">omnivore</option>
                  <option value="vegetarian">vegetarian</option>
                  <option value="vegan">vegan</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Occupation / job title</p>
                <input className="w-full rounded-xl border bg-card p-3" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Height</p>
                <input className="w-full rounded-xl border bg-card p-3" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={'e.g. 5\'9" / 175 cm'} />
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-2xl font-heading font-bold mb-2">Non-negotiable partner quality</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Pick one quality you can&apos;t compromise on.
            </p>
            <div className="rounded-xl border bg-card p-3 mb-4">
              <p className="text-xs text-muted-foreground">Your persona analysis</p>
              <p className="text-sm font-semibold mt-1">{personaLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                O {liveScores.openness} • C {liveScores.conscientiousness} • E {liveScores.extraversion} • A {liveScores.agreeableness} • N {liveScores.neuroticism}
              </p>
            </div>

            <div className="space-y-3 flex-1">
              {partnerPriorities.map((item) => {
                const selected = nonNegotiableTrait === item.trait;
                return (
                  <button
                    key={item.trait}
                    type="button"
                    onClick={() => setNonNegotiableTrait(item.trait)}
                    className={`w-full rounded-xl border p-3 text-left ${selected ? 'gradient-coral text-primary-foreground border-transparent' : 'bg-card'}`}
                  >
                    <p className="text-base font-semibold">{item.emoji} {item.title}</p>
                    <p className={`text-xs mt-1 ${selected ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>{item.subtitle}</p>
                    <p className={`text-xs mt-2 ${selected ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                      Your score: {liveScores[item.trait]}{selected ? ' • Used as your top preference' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <Button onClick={next} disabled={!canNext()} className="w-full mt-6 gradient-coral">
          {step < TOTAL_STEPS ? 'Next' : 'Finish'}
        </Button>
      </div>
    </div>
  );
}
