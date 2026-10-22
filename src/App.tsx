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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accountData));
  }, [accountData]);

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

  const updateField = <K extends keyof typeof emptyPullForm>(field: K, value: (typeof emptyPullForm)[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
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
              {characterGoals.map(({ name, constellations, refinement, completed }) => (
                <div key={name} className="progress-item">
                  <div className="progress-header">
                    <strong>{name}</strong>
                    <span>{completed ? 'Complete' : 'In progress'}</span>
                  </div>
                  <div className="bars">
                    <div>
                      <label>C{constellations.current}/{constellations.target}</label>
                      <div className="progress-bar">
                        <span style={{ width: `${constellations.percent}%` }} />
                      </div>
                    </div>
                    <div>
                      <label>R{refinement.current}/{refinement.target}</label>
                      <div className="progress-bar">
                        <span style={{ width: `${refinement.percent}%` }} />
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
              {weaponGoals.map(({ name, refinement, completed }) => (
                <div key={name} className="progress-item">
                  <div className="progress-header">
                    <strong>{name}</strong>
                    <span>{completed ? 'Complete' : 'In progress'}</span>
                  </div>
                  <div className="bars">
                    <div>
                      <label>R{refinement.current}/{refinement.target}</label>
                      <div className="progress-bar">
                        <span style={{ width: `${refinement.percent}%` }} />
                      </div>
                    </div>
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
