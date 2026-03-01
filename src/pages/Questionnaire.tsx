import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, saveQuestionnaire } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { computePersonalityScores, TRAITS, TraitKey, PreferenceLevels, mapDesiredLevel } from '@/lib/scoring';

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
  { trait: 'agreeableness', text: 'I care about others\' feelings.' },
  { trait: 'agreeableness', text: 'I enjoy helping people.' },
  { trait: 'agreeableness', text: 'I try to avoid conflicts.' },
  { trait: 'neuroticism', text: 'I worry often.' },
  { trait: 'neuroticism', text: 'I feel stressed easily.' },
  { trait: 'neuroticism', text: 'I get anxious in new situations.' },
];

const LIKERT = [1, 2, 3, 4, 5];
const PREF_LEVELS: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

export default function Questionnaire() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=basic, 1-3=likert pages, 4=preferences
  const [bio, setBio] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [prefLevels, setPrefLevels] = useState<PreferenceLevels>({
    openness: 'medium', conscientiousness: 'medium', extraversion: 'medium',
    agreeableness: 'medium', neuroticism: 'medium',
  });
  const [priorityOrder] = useState<TraitKey[]>([...TRAITS]);

  const setAnswer = (idx: number, val: number) => setAnswers(a => ({ ...a, [idx]: val }));

  const canNext = () => {
    if (step === 0) return bio.trim().length > 0;
    if (step >= 1 && step <= 3) {
      const start = (step - 1) * 5;
      const end = Math.min(start + 5, likertQuestions.length);
      return Array.from({ length: end - start }, (_, i) => start + i).every(i => answers[i] !== undefined);
    }
    return true;
  };

  const finish = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const rawAnswers: Record<TraitKey, number[]> = {
      openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [],
    };
    likertQuestions.forEach((q, i) => {
      rawAnswers[q.trait].push(answers[i] ?? 3);
    });
    const scores = computePersonalityScores(rawAnswers);
    await saveQuestionnaire(userId, {
      bio, age, gender, lat: 0, lon: 0,
      scores, preferenceLevels: prefLevels, priorityOrder,
      minAge: 18, maxAge: 99,
    });
    navigate('/photos');
  };

  const next = () => {
    if (step < 4) setStep(s => s + 1);
    else void finish();
  };

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col">
      <div className="max-w-sm mx-auto px-6 py-8 flex-1 flex flex-col">
        {step === 0 && (
          <>
            <h2 className="text-2xl font-heading font-bold mb-6">About You</h2>
            <textarea placeholder="Short bio..." value={bio} onChange={e => setBio(e.target.value)} className="w-full h-20 border rounded-xl p-3 bg-card mb-4" />
            <label className="text-sm text-muted-foreground mb-1">Age</label>
            <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="border rounded-xl p-3 bg-card mb-4 w-24" />
            <label className="text-sm text-muted-foreground mb-1">Gender</label>
            <div className="flex gap-2 mb-4">
              {(['Male', 'Female', 'Other'] as const).map(g => (
                <button key={g} type="button" onClick={() => setGender(g)} className={`flex-1 py-2.5 rounded-xl text-sm ${gender === g ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>{g}</button>
              ))}
            </div>
          </>
        )}

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
                        {LIKERT.map(v => (
                          <button key={v} type="button" onClick={() => setAnswer(idx, v)} className={`w-10 h-10 rounded-full text-sm font-bold ${answers[idx] === v ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>{v}</button>
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
            <h2 className="text-2xl font-heading font-bold mb-6">Partner Preferences</h2>
            <div className="space-y-4 flex-1">
              {TRAITS.map(trait => (
                <div key={trait}>
                  <p className="text-sm font-medium capitalize mb-1">{trait}</p>
                  <div className="flex gap-2">
                    {PREF_LEVELS.map(lvl => (
                      <button key={lvl} type="button" onClick={() => setPrefLevels(p => ({ ...p, [trait]: lvl }))} className={`flex-1 py-2 rounded-xl text-sm capitalize ${prefLevels[trait] === lvl ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>{lvl}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Button onClick={next} disabled={!canNext()} className="w-full mt-6 gradient-coral">{step < 4 ? 'Next' : 'Finish'}</Button>
      </div>
    </div>
  );
}
