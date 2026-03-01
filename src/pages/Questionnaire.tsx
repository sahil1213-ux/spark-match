import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, getCurrentUserProfile, saveQuestionnaire } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { computePersonalityScores, TRAITS, TraitKey } from '@/lib/scoring';

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

const LIKERT = [1, 2, 3, 4, 5];

function titleCase(trait: string) {
  return trait.charAt(0).toUpperCase() + trait.slice(1);
}

export default function Questionnaire() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1-3=personality pages, 4=priority
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [priorityOrder, setPriorityOrder] = useState<TraitKey[]>([...TRAITS]);
  const [draggedTrait, setDraggedTrait] = useState<TraitKey | null>(null);

  const setAnswer = (idx: number, val: number) => setAnswers((a) => ({ ...a, [idx]: val }));

  const liveScores = useMemo(() => {
    const rawAnswers: Record<TraitKey, number[]> = {
      openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [],
    };

    likertQuestions.forEach((q, i) => {
      rawAnswers[q.trait].push(answers[i] ?? 3);
    });

    return computePersonalityScores(rawAnswers);
  }, [answers]);

  const canNext = () => {
    if (step >= 1 && step <= 3) {
      const start = (step - 1) * 5;
      const end = Math.min(start + 5, likertQuestions.length);
      return Array.from({ length: end - start }, (_, i) => start + i).every((i) => answers[i] !== undefined);
    }

    return priorityOrder.length === TRAITS.length;
  };

  const finish = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const profile = await getCurrentUserProfile();
    if (!profile) return;

    const rawAnswers: Record<TraitKey, number[]> = {
      openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [],
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
    });

    navigate('/photos');
  };

  const next = () => {
    if (step < 4) setStep((s) => s + 1);
    else void finish();
  };

  const handleDrop = (targetTrait: TraitKey) => {
    if (!draggedTrait || draggedTrait === targetTrait) return;

    setPriorityOrder((prev) => {
      const withoutDragged = prev.filter((trait) => trait !== draggedTrait);
      const targetIndex = withoutDragged.indexOf(targetTrait);
      withoutDragged.splice(targetIndex, 0, draggedTrait);
      return withoutDragged;
    });

    setDraggedTrait(null);
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
            <h2 className="text-2xl font-heading font-bold mb-2">Partner Priority</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Drag traits to set 1st to 5th priority. We automatically use threshold 80 for the top priority trait.
            </p>

            <div className="space-y-3 flex-1">
              {priorityOrder.map((trait, index) => (
                <div
                  key={trait}
                  draggable
                  onDragStart={() => setDraggedTrait(trait)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(trait)}
                  className="rounded-xl border bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {index + 1}. {titleCase(trait)}
                    </p>
                    <span className="text-xs text-muted-foreground">Your score: {liveScores[trait]}</span>
                  </div>
                  {index === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Recommendation starts with {titleCase(trait)} ≥ 80.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <Button onClick={next} disabled={!canNext()} className="w-full mt-6 gradient-coral">
          {step < 4 ? 'Next' : 'Finish'}
        </Button>
      </div>
    </div>
  );
}
