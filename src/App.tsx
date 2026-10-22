import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { buildAccountOverview, getGoalProgress, summarizePulls } from './domain/pulls';
import { defaultAccountData } from './data/defaultAccount';
import type { AccountData, BannerType, PullEntry } from './domain/types';

const STORAGE_KEY = 'genshin-account-manager:v1';
const bannerOptions: BannerType[] = ['character', 'chronicled', 'weapon', 'standard'];

const emptyPullForm = {
  banner: 'character' as BannerType,
  item: '',
  itemType: 'character' as 'character' | 'weapon',
  rank: 5,
  result: 'win' as 'win' | 'lose' | 'guaranteed',
  pity: 0,
  patch: '5.3',
  region: 'Mondstadt',
  timestamp: new Date().toISOString(),
};

function loadFromStorage(): AccountData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return defaultAccountData as AccountData;
    }
    return JSON.parse(saved) as AccountData;
  } catch {
    return defaultAccountData as AccountData;
  }
}

function App() {
  const [accountData, setAccountData] = useState<AccountData>(() => loadFromStorage());
  const [form, setForm] = useState(emptyPullForm);
  const [selectedCharacterName, setSelectedCharacterName] = useState('Navia');
  const [selectedWeaponName, setSelectedWeaponName] = useState('Primordial Jade Cutter');

  const characterNames = Object.keys(accountData.characters);
  const weaponNames = Object.keys(accountData.weapons);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accountData));
  }, [accountData]);

  useEffect(() => {
    if (!characterNames.includes(selectedCharacterName) && characterNames.length > 0) {
      setSelectedCharacterName(characterNames[0]);
    }
  }, [characterNames, selectedCharacterName]);

  useEffect(() => {
    if (!weaponNames.includes(selectedWeaponName) && weaponNames.length > 0) {
      setSelectedWeaponName(weaponNames[0]);
    }
  }, [weaponNames, selectedWeaponName]);

  const overview = useMemo(() => buildAccountOverview(accountData), [accountData]);

  const allPulls = useMemo<PullEntry[]>(() => {
    const merged: PullEntry[] = [
      ...accountData.pulls.character,
      ...accountData.pulls.chronicled,
      ...accountData.pulls.weapon,
      ...accountData.pulls.standard,
    ];

    return merged.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }, [accountData]);

  const recentPulls = allPulls.slice(0, 8);

  const bannerBreakdown = bannerOptions.map((banner) => {
    const pulls = accountData.pulls[banner];
    const summary = summarizePulls(pulls);
    return {
      banner,
      pulls: summary.totalPulls,
      fiveStars: summary.fiveStars,
      winRate: summary.winRate,
      averagePity: summary.averagePity,
    };
  });

  const characterGoals = Object.entries(accountData.characters).map(([name, goal]) => {
    const constellations = getGoalProgress(goal.currentConstellations, goal.targetConstellations);
    const refinement = getGoalProgress(goal.currentRefinement, goal.targetRefinement);

    return {
      name,
      goal,
      constellations,
      refinement,
      completed:
        goal.currentConstellations >= goal.targetConstellations &&
        goal.currentRefinement >= goal.targetRefinement,
    };
  });

  const weaponGoals = Object.entries(accountData.weapons).map(([name, goal]) => {
    const refinement = getGoalProgress(goal.currentRefinement, goal.targetRefinement);
    return {
      name,
      goal,
      refinement,
      completed: goal.currentRefinement >= goal.targetRefinement,
    };
  });

  const remainingObjectives = [
    ...characterGoals
      .filter(({ completed }) => !completed)
      .map(({ name, constellations, refinement }) => ({
        label: `${name}`,
        detail: `C${constellations.current}/${constellations.target} • R${refinement.current}/${refinement.target}`,
      })),
    ...weaponGoals
      .filter(({ completed }) => !completed)
      .map(({ name, refinement }) => ({
        label: `${name}`,
        detail: `R${refinement.current}/${refinement.target}`,
      })),
  ].slice(0, 5);

  const selectedCharacter = accountData.characters[selectedCharacterName];
  const selectedWeapon = accountData.weapons[selectedWeaponName];

  const selectedCharacterSummary = selectedCharacter
    ? {
        constellations: getGoalProgress(selectedCharacter.currentConstellations, selectedCharacter.targetConstellations),
        refinement: getGoalProgress(selectedCharacter.currentRefinement, selectedCharacter.targetRefinement),
      }
    : null;

  const selectedWeaponSummary = selectedWeapon
    ? getGoalProgress(selectedWeapon.currentRefinement, selectedWeapon.targetRefinement)
    : null;

  const updateField = <K extends keyof typeof emptyPullForm>(field: K, value: (typeof emptyPullForm)[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const updateCharacterGoal = (
    characterName: string,
    field: 'currentConstellations' | 'targetConstellations' | 'currentRefinement' | 'targetRefinement',
    delta: number,
  ) => {
    setAccountData((previous) => {
      const current = previous.characters[characterName];
      if (!current) {
        return previous;
      }

      return {
        ...previous,
        characters: {
          ...previous.characters,
          [characterName]: {
            ...current,
            [field]: Math.max(0, current[field] + delta),
          },
        },
      };
    });
  };

  const toggleCharacterFlag = (characterName: string, field: 'owned' | 'hasSkin' | 'targetSkin') => {
    setAccountData((previous) => {
      const current = previous.characters[characterName];
      if (!current) {
        return previous;
      }

      return {
        ...previous,
        characters: {
          ...previous.characters,
          [characterName]: {
            ...current,
            [field]: !current[field],
          },
        },
      };
    });
  };

  const updateWeaponGoal = (weaponName: string, field: 'currentRefinement' | 'targetRefinement', delta: number) => {
    setAccountData((previous) => {
      const current = previous.weapons[weaponName];
      if (!current) {
        return previous;
      }

      return {
        ...previous,
        weapons: {
          ...previous.weapons,
          [weaponName]: {
            ...current,
            [field]: Math.max(0, current[field] + delta),
          },
        },
      };
    });
  };

  const toggleWeaponFlag = (weaponName: string, field: 'owned') => {
    setAccountData((previous) => {
      const current = previous.weapons[weaponName];
      if (!current) {
        return previous;
      }

      return {
        ...previous,
        weapons: {
          ...previous.weapons,
          [weaponName]: {
            ...current,
            [field]: !current[field],
          },
        },
      };
    });
  };

  const addPull = () => {
    if (!form.item.trim()) {
      return;
    }

    const newPull: PullEntry = {
      id: `${form.banner}-${Date.now()}`,
      banner: form.banner,
      item: form.item.trim(),
      itemType: form.itemType,
      rank: form.rank,
      result: form.result,
      pity: form.pity,
      patch: form.patch,
      region: form.region,
      timestamp: form.timestamp,
    };

    setAccountData((previous) => ({
      ...previous,
      pulls: {
        ...previous.pulls,
        [form.banner]: [newPull, ...previous.pulls[form.banner]],
      },
    }));

    setForm({
      ...emptyPullForm,
      timestamp: new Date().toISOString(),
    });
  };

  const exportData = () => {
    const json = JSON.stringify(accountData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'genshin-account-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setAccountData(parsed as AccountData);
      } catch {
        window.alert('The selected file could not be imported. Please choose a valid JSON export.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Personal tracker</p>
          <h1>Genshin Account Manager</h1>
        </div>
        <div className="toolbar">
          <label className="button secondary" htmlFor="import-file">
            Import JSON
          </label>
          <input id="import-file" type="file" accept="application/json" onChange={importData} hidden />
          <button className="button primary" type="button" onClick={exportData}>
            Export JSON
          </button>
        </div>
      </header>

      <main className="content">
        <section className="overview-grid">
          <StatCard label="Primogems" value={accountData.account.primogems.toLocaleString()} detail="Current reserve" />
          <StatCard label="Intertwined Fates" value={accountData.account.intertwinedFates.toString()} detail="Available" />
          <StatCard label="Collection" value={`${Math.round((Object.values(accountData.characters).filter((c) => c.owned).length / Object.keys(accountData.characters).length) * 100)}%`} detail="Character progress" />
          <StatCard label="Total pulls" value={overview.totalPulls.toString()} detail="Across all banners" />
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Quick stats</h2>
          </div>

          <div className="stats-grid">
            <MiniStat label="Character pity" value={`${accountData.account.currentPity.character}`} />
            <MiniStat label="Weapon pity" value={`${accountData.account.currentPity.weapon}`} />
            <MiniStat label="Standard pity" value={`${accountData.account.currentPity.standard}`} />
            <MiniStat label="Character win rate" value={`${(summarizePulls(accountData.pulls.character).winRate * 100).toFixed(0)}%`} />
            <MiniStat label="5★ total" value={`${overview.characterStats.fiveStars + overview.weaponStats.fiveStars}`} />
            <MiniStat label="Avg. pity" value={`${overview.characterStats.averagePity.toFixed(0)}`} />
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Banner breakdown</h2>
          </div>

          <div className="banner-grid">
            {bannerBreakdown.map(({ banner, pulls, fiveStars, winRate, averagePity }) => (
              <div key={banner} className="banner-card">
                <div className="banner-card-header">
                  <strong>{banner}</strong>
                  <span>{pulls} pulls</span>
                </div>
                <div className="banner-metric">
                  <label>5★</label>
                  <strong>{fiveStars}</strong>
                </div>
                <div className="banner-metric">
                  <label>Win rate</label>
                  <strong>{(winRate * 100).toFixed(0)}%</strong>
                </div>
                <div className="banner-metric">
                  <label>Avg. pity</label>
                  <strong>{averagePity.toFixed(0)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="two-column">
          <div className="panel">
            <div className="section-heading">
              <h2>Character goals</h2>
            </div>

            <div className="progress-list">
              {characterGoals.map(({ name, goal, constellations, refinement, completed }) => (
                <div key={name} className="progress-item">
                  <div className="progress-header">
                    <strong>{name}</strong>
                    <span>{completed ? 'Complete' : 'In progress'}</span>
                  </div>

                  <div className="button-row checkbox-row">
                    <button type="button" className="mini-button" onClick={() => toggleCharacterFlag(name, 'owned')}>
                      {goal.owned ? 'Owned' : 'Not owned'}
                    </button>
                    <button type="button" className="mini-button" onClick={() => toggleCharacterFlag(name, 'hasSkin')}>
                      {goal.hasSkin ? 'Skin yes' : 'Skin no'}
                    </button>
                    <button type="button" className="mini-button" onClick={() => toggleCharacterFlag(name, 'targetSkin')}>
                      {goal.targetSkin ? 'Target skin' : 'No target skin'}
                    </button>
                  </div>

                  <div className="bars">
                    <div className="goal-row">
                      <label>C{constellations.current}/{constellations.target}</label>
                      <div className="goal-control">
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'currentConstellations', -1)}>-</button>
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'currentConstellations', 1)}>+</button>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${constellations.percent}%` }} />
                    </div>

                    <div className="goal-row">
                      <label>R{refinement.current}/{refinement.target}</label>
                      <div className="goal-control">
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'currentRefinement', -1)}>-</button>
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'currentRefinement', 1)}>+</button>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${refinement.percent}%` }} />
                    </div>

                    <div className="goal-row">
                      <label>Target C</label>
                      <div className="goal-control">
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'targetConstellations', -1)}>-</button>
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'targetConstellations', 1)}>+</button>
                      </div>
                    </div>

                    <div className="goal-row">
                      <label>Target R</label>
                      <div className="goal-control">
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'targetRefinement', -1)}>-</button>
                        <button type="button" className="mini-button" onClick={() => updateCharacterGoal(name, 'targetRefinement', 1)}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading">
              <h2>Weapon goals</h2>
            </div>

            <div className="progress-list">
              {weaponGoals.map(({ name, goal, refinement, completed }) => (
                <div key={name} className="progress-item">
                  <div className="progress-header">
                    <strong>{name}</strong>
                    <span>{completed ? 'Complete' : 'In progress'}</span>
                  </div>

                  <div className="goal-row">
                    <label>R{refinement.current}/{refinement.target}</label>
                    <div className="goal-control">
                      <button type="button" className="mini-button" onClick={() => updateWeaponGoal(name, 'currentRefinement', -1)}>-</button>
                      <button type="button" className="mini-button" onClick={() => updateWeaponGoal(name, 'currentRefinement', 1)}>+</button>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${refinement.percent}%` }} />
                  </div>

                  <div className="goal-row" style={{ marginTop: 12 }}>
                    <label>Target R</label>
                    <div className="goal-control">
                      <button type="button" className="mini-button" onClick={() => updateWeaponGoal(name, 'targetRefinement', -1)}>-</button>
                      <button type="button" className="mini-button" onClick={() => updateWeaponGoal(name, 'targetRefinement', 1)}>+</button>
                    </div>
                  </div>

                  <div className="button-row">
                    <button type="button" className="mini-button" onClick={() => toggleWeaponFlag(name, 'owned')}>
                      {goal.owned ? 'Owned' : 'Not owned'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="two-column">
          <div className="panel">
            <div className="section-heading">
              <h2>Remaining objectives</h2>
            </div>

            <ul className="objective-list">
              {remainingObjectives.length === 0 ? (
                <li className="objective-empty">Everything is complete.</li>
              ) : (
                remainingObjectives.map((objective) => (
                  <li key={`${objective.label}-${objective.detail}`}>
                    <strong>{objective.label}</strong>
                    <span>{objective.detail}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="panel form-panel">
            <div className="section-heading">
              <h2>Add a pull</h2>
            </div>

            <div className="pull-form">
              <div className="field-row">
                <label>
                  Banner
                  <select value={form.banner} onChange={(event) => updateField('banner', event.target.value as BannerType)}>
                    {bannerOptions.map((banner) => (
                      <option key={banner} value={banner}>
                        {banner}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Item
                  <input value={form.item} onChange={(event) => updateField('item', event.target.value)} placeholder="Navia" />
                </label>

                <label>
                  Type
                  <select value={form.itemType} onChange={(event) => updateField('itemType', event.target.value as 'character' | 'weapon')}>
                    <option value="character">Character</option>
                    <option value="weapon">Weapon</option>
                  </select>
                </label>
              </div>

              <div className="field-row">
                <label>
                  Rank
                  <input type="number" min={3} max={5} value={form.rank} onChange={(event) => updateField('rank', Number(event.target.value))} />
                </label>

                <label>
                  Result
                  <select value={form.result} onChange={(event) => updateField('result', event.target.value as 'win' | 'lose' | 'guaranteed')}>
                    <option value="win">Win</option>
                    <option value="lose">Lose</option>
                    <option value="guaranteed">Guaranteed</option>
                  </select>
                </label>

                <label>
                  Pity
                  <input type="number" min={0} value={form.pity} onChange={(event) => updateField('pity', Number(event.target.value))} />
                </label>
              </div>

              <div className="field-row">
                <label>
                  Patch
                  <input value={form.patch} onChange={(event) => updateField('patch', event.target.value)} />
                </label>

                <label>
                  Region
                  <input value={form.region} onChange={(event) => updateField('region', event.target.value)} />
                </label>

                <label>
                  Timestamp
                  <input type="datetime-local" value={form.timestamp.slice(0, 16)} onChange={(event) => updateField('timestamp', new Date(event.target.value).toISOString())} />
                </label>
              </div>

              <button type="button" className="button primary submit-button" onClick={addPull}>
                Save pull
              </button>
            </div>
          </div>
        </section>

        <section className="two-column">
          <div className="panel">
            <div className="section-heading">
              <h2>Character detail</h2>
            </div>

            <div className="selection-list">
              {characterNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`chip ${selectedCharacterName === name ? 'chip-selected' : ''}`}
                  onClick={() => setSelectedCharacterName(name)}
                >
                  {name}
                </button>
              ))}
            </div>

            {selectedCharacter && selectedCharacterSummary && (
              <div className="detail-card">
                <div className="detail-header">
                  <strong>{selectedCharacterName}</strong>
                  <span>{selectedCharacter.owned ? 'Owned' : 'Missing'}</span>
                </div>
                <div className="detail-grid">
                  <div>
                    <label>Constellations</label>
                    <strong>
                      {selectedCharacter.currentConstellations}/{selectedCharacter.targetConstellations}
                    </strong>
                    <div className="mini-progress">
                      <span style={{ width: `${selectedCharacterSummary.constellations.percent}%` }} />
                    </div>
                  </div>
                  <div>
                    <label>Refinement</label>
                    <strong>
                      {selectedCharacter.currentRefinement}/{selectedCharacter.targetRefinement}
                    </strong>
                    <div className="mini-progress">
                      <span style={{ width: `${selectedCharacterSummary.refinement.percent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="section-heading">
              <h2>Weapon detail</h2>
            </div>

            <div className="selection-list">
              {weaponNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`chip ${selectedWeaponName === name ? 'chip-selected' : ''}`}
                  onClick={() => setSelectedWeaponName(name)}
                >
                  {name}
                </button>
              ))}
            </div>

            {selectedWeapon && selectedWeaponSummary && (
              <div className="detail-card">
                <div className="detail-header">
                  <strong>{selectedWeaponName}</strong>
                  <span>{selectedWeapon.owned ? 'Owned' : 'Missing'}</span>
                </div>
                <div className="detail-grid">
                  <div>
                    <label>Refinement</label>
                    <strong>
                      {selectedWeapon.currentRefinement}/{selectedWeapon.targetRefinement}
                    </strong>
                    <div className="mini-progress">
                      <span style={{ width: `${selectedWeaponSummary.percent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Recent pulls</h2>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Banner</th>
                  <th>Rank</th>
                  <th>Result</th>
                  <th>Pity</th>
                  <th>Patch</th>
                </tr>
              </thead>
              <tbody>
                {recentPulls.map((pull) => (
                  <tr key={pull.id}>
                    <td>{pull.item}</td>
                    <td>{pull.banner}</td>
                    <td>{pull.rank}★</td>
                    <td>{pull.result}</td>
                    <td>{pull.pity}</td>
                    <td>{pull.patch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
