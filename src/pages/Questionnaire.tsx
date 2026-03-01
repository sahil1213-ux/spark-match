import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, saveQuestionnaire } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { computePersonalityScores, PreferenceLevels, TRAITS, TraitKey } from '@/lib/scoring';

const traitQuestions: Record<TraitKey, string[]> = {
  openness: ['I enjoy trying new activities.', 'I seek creative experiences.', 'I prefer variety over routine.'],
  conscientiousness: ['I plan ahead.', 'I finish what I start.', 'I stay organized.'],
  extraversion: ['I feel energized around people.', 'I enjoy social events.', 'I like meeting new people.'],
  agreeableness: ["I care about others' feelings.", 'I enjoy helping people.', 'I try to avoid conflicts.'],
  neuroticism: ['I worry often.', 'I feel stressed easily.', 'I get anxious in new situations.'],
};

const pageTraits: TraitKey[][] = [['openness', 'conscientiousness'], ['extraversion', 'agreeableness'], ['neuroticism']];

export default function Questionnaire() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [bio, setBio] = useState('');
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Other');
  const [location, setLocation] = useState({ lat: 0, lon: 0 });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [preferenceLevels, setPreferenceLevels] = useState<PreferenceLevels>({
    openness: 'medium', conscientiousness: 'medium', extraversion: 'medium', agreeableness: 'medium', neuroticism: 'medium',
  });
  const [priorityOrder, setPriorityOrder] = useState<TraitKey[]>([...TRAITS]);

  const setAnswer = (key: string, value: number) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const detectLocation = async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        });
      }
    } catch {
      // no-op fallback for browsers without geolocation permission
    }
  };

  const submit = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    const grouped = TRAITS.reduce((acc, trait) => {
      acc[trait] = traitQuestions[trait].map((_, idx) => answers[`${trait}_${idx}`] ?? 3);
      return acc;
    }, {} as Record<TraitKey, number[]>);
    const scores = computePersonalityScores(grouped);

    await saveQuestionnaire(uid, {
      bio,
      age,
      gender,
      lat: location.lat,
      lon: location.lon,
      scores,
      preferenceLevels,
      priorityOrder,
      minAge: 18,
      maxAge: 99,
    });

    navigate('/photos');
  };

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-md mx-auto px-6 py-8 space-y-6">
        <h2 className="text-2xl font-heading font-bold">Questionnaire - Page {page + 1} / 5</h2>

        {page === 0 && (
          <div className="space-y-3">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border rounded-xl p-3" placeholder="Bio" />
            <input type="number" className="w-full border rounded-xl p-3" value={age} onChange={(e) => setAge(Number(e.target.value))} />
            <select className="w-full border rounded-xl p-3" value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            <Button onClick={detectLocation} variant="outline" className="w-full">Use Current Location</Button>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-xl p-3" placeholder="Lat" value={location.lat} onChange={(e) => setLocation((p) => ({ ...p, lat: Number(e.target.value) }))} />
              <input className="border rounded-xl p-3" placeholder="Lon" value={location.lon} onChange={(e) => setLocation((p) => ({ ...p, lon: Number(e.target.value) }))} />
            </div>
          </div>
        )}

        {[1, 2, 3].includes(page) && (
          <div className="space-y-5">
            {pageTraits[page - 1].map((trait) => (
              <div key={trait} className="space-y-2">
                <h3 className="font-semibold capitalize">{trait}</h3>
                {traitQuestions[trait].map((question, idx) => (
                  <div key={question} className="border rounded-xl p-3">
                    <p className="text-sm mb-2">{question}</p>
                    <div className="flex gap-2">{[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} className={`px-3 py-1 rounded ${answers[`${trait}_${idx}`] === value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`} onClick={() => setAnswer(`${trait}_${idx}`, value)}>{value}</button>
                    ))}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {page === 4 && (
          <div className="space-y-4">
            {TRAITS.map((trait) => (
              <div key={trait} className="border rounded-xl p-3 space-y-2">
                <p className="font-medium capitalize">{trait}</p>
                <select className="w-full border rounded-lg p-2" value={preferenceLevels[trait]} onChange={(e) => setPreferenceLevels((p) => ({ ...p, [trait]: e.target.value as 'low' | 'medium' | 'high' }))}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
                <select className="w-full border rounded-lg p-2" value={priorityOrder.indexOf(trait) + 1} onChange={(e) => {
                  const rank = Number(e.target.value) - 1;
                  const next = [...priorityOrder];
                  const currentIndex = next.indexOf(trait);
                  const displaced = next[rank];
                  next[rank] = trait;
                  next[currentIndex] = displaced;
                  setPriorityOrder(next);
                }}>
                  {[1, 2, 3, 4, 5].map((rank) => <option key={rank} value={rank}>Priority {rank}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {page > 0 && <Button variant="outline" onClick={() => setPage((p) => p - 1)} className="flex-1">Back</Button>}
          {page < 4 ? <Button onClick={() => setPage((p) => p + 1)} className="flex-1">Next</Button> : <Button onClick={submit} className="flex-1 gradient-coral">Finish</Button>}
        </div>
      </div>
    </div>
  );
}
