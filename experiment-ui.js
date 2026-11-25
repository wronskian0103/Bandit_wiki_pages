(() => {
  'use strict';

  const policies = {
    ucb: {name: 'Upper confidence bound', short: 'UCB', dash: 'none'},
    etc: {name: 'Explore-then-commit', short: 'ETC', dash: '8 5'},
    uniform: {name: 'Uniform random', short: 'Uniform', dash: '2 4'}
  };

  function render() {
    return `<div class="page lab-page">
      <header class="lab-header"><h1>Bandit experiment lab</h1>
        <p class="page-lead">How much reward does exploration cost? Compare policies on the same Bernoulli arms, then inspect which arms they chose.</p>
        <p class="lab-first-try">Try <strong>Equal arms</strong> and run the experiment. Every choice then has zero pseudo-regret, even though the observed rewards can differ.</p>
      </header>
      <div class="lab-workbench">
        <form id="lab-form" class="lab-panel lab-settings" novalidate>
          <h2>Experiment settings</h2>
          <label for="lab-means">Success probabilities</label>
          <input id="lab-means" type="text" value="0.30, 0.50, 0.70" aria-describedby="lab-means-hint" spellcheck="false" autocomplete="off">
          <p class="lab-hint" id="lab-means-hint">Enter 2–10 arm means separated by commas. Each pull earns 1 on success and 0 otherwise.</p>
          <div class="lab-presets" aria-label="Probability presets">
            <button type="button" data-lab-means="0.30, 0.50, 0.70">Wide gaps</button>
            <button type="button" data-lab-means="0.48, 0.50, 0.52">Close arms</button>
            <button type="button" data-lab-means="0.50, 0.50, 0.50">Equal arms</button>
          </div>
          <div class="lab-number-grid">
            <div><label for="lab-horizon">Rounds per run</label><input type="number" id="lab-horizon" min="2" max="2000" step="1" value="300"></div>
            <div><label for="lab-repetitions">Repetitions</label><input type="number" id="lab-repetitions" min="1" max="100" step="1" value="20"></div>
            <div><label for="lab-seed">Random seed</label><input type="number" id="lab-seed" min="0" max="4294967295" step="1" value="42"></div>
            <div><label for="lab-m">ETC pulls per arm</label><input type="number" id="lab-m" min="1" step="1" value="10"></div>
          </div>
          <fieldset><legend>Policies to compare</legend>
            ${Object.entries(policies).map(([id, policy]) => `<label class="lab-policy-option"><input id="lab-policy-${id}" type="checkbox" name="lab-policy" value="${id}" checked> ${policy.name}</label>`).join('')}
          </fieldset>
          <p class="lab-error" id="lab-error" role="alert" hidden></p>
          <button class="button lab-run" id="lab-run" type="submit">Run experiment</button>
          <p class="lab-status" role="status" aria-live="polite" id="lab-status"></p>
        </form>
        <section class="lab-panel lab-overview" aria-labelledby="lab-chart-heading">
          <h2 id="lab-chart-heading">Cumulative pseudo-regret</h2>
          <p>Each round adds the difference between the best arm’s mean and the chosen arm’s mean. Lower curves indicate less reward forgone.</p>
          <div id="lab-chart"></div>
          <div id="lab-summary"></div>
        </section>
      </div>
      <div id="lab-inspector"></div>
      <details class="lab-method"><summary>How the experiment works</summary><div>
        <p>For arm <i>a</i> with mean <i>μ<sub>a</sub></i>, the simulator draws a Bernoulli reward with success probability <i>μ<sub>a</sub></i>. The policies see only the rewards of arms they play. The simulator uses the true means to score their decisions.</p>
        <p>Along one run, cumulative pseudo-regret through round <i>t</i> is <i>∑<sub>s=1</sub><sup>t</sup> (μ* − μ<sub>Aₛ</sub>)</i>, where <i>μ*</i> is the largest arm mean. Averaging those sums across repetitions estimates expected regret. Observed reward counts the successes that actually occurred.</p>
        <dl>
          <dt>Upper confidence bound (UCB)</dt><dd>At every round, choose the largest index <i>μ̂<sub>a</sub> + √(4 ln(n) / T<sub>a</sub>)</i>, with horizon <i>n</i> and prior pull count <i>T<sub>a</sub></i>. Untried arms have infinite index. This uses the confidence parameter <i>δ = 1/n²</i> from the notes. <a href="#/article/the-upper-confidence-bound-algorithm">Read the UCB article</a>.</dd>
          <dt>Explore-then-commit (ETC)</dt><dd>Play every arm <i>m</i> times in round-robin order, then choose an arm with the highest empirical mean for the remaining rounds. Both UCB and ETC break ties uniformly at random. <a href="#/article/the-explore-then-commit-algorithm">Read the ETC article</a>.</dd>
          <dt>Uniform random</dt><dd>Choose each of the <i>k</i> arms with probability <i>1/k</i> every round.</dd>
        </dl>
        <p>The random seed makes a run reproducible. Each repetition gets fresh reward streams. Within a repetition, every policy sees the same reward on the <i>j</i>th pull of the same arm, even when those pulls happen in different rounds. <a href="#/article/stochastic-bandits">Read the regret decomposition</a>.</p>
      </div></details>
    </div>`;
  }

  function readSettings(form) {
    function numberField(id, label, min, max) {
      const field = form.querySelector('#' + id);
      const value = Number(field.value);
      if (!field.value.trim() || !Number.isInteger(value) || value < min || value > max) {
        field.setAttribute('aria-invalid', 'true');
        throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
      }
      return value;
    }
    const meansField = form.querySelector('#lab-means');
    const parts = meansField.value.split(',').map(part => part.trim());
    const means = parts.map(Number);
    if (parts.length < 2 || parts.length > 10 || parts.some(part => !/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(part)) || means.some(p => !Number.isFinite(p) || p < 0 || p > 1)) {
      meansField.setAttribute('aria-invalid', 'true');
      throw new Error('Enter 2–10 comma-separated probabilities between 0 and 1, such as 0.3, 0.5, 0.7.');
    }
    const selected = Object.keys(policies).filter(id => form.querySelector('#lab-policy-' + id).checked);
    if (!selected.length) throw new Error('Select at least one policy to run.');
    const horizon = numberField('lab-horizon', 'Rounds per run', means.length, 2000);
    const repetitions = numberField('lab-repetitions', 'Repetitions', 1, 100);
    const seed = numberField('lab-seed', 'Random seed', 0, 4294967295);
    const m = selected.includes('etc') ? numberField('lab-m', 'ETC pulls per arm', 1, Math.floor(horizon / means.length)) : 1;
    return {means, horizon, repetitions, seed, m, policies:selected};
  }

  function format(value) {
    if (value !== 0 && Math.abs(value) < 0.01) return value.toExponential(1);
    return value.toLocaleString('en-US', {maximumFractionDigits: 2});
  }

  function niceCeiling(value) {
    if (value <= 0) return 1;
    const scale = 10 ** Math.floor(Math.log10(value));
    if (scale === 0) return value;
    return Math.ceil(value / scale * 2) / 2 * scale;
  }

  function chart(settings, results) {
    const peak = Math.max(...results.map(result => result.regretCurve[settings.horizon]));
    const yMax = niceCeiling(peak);
    const width = 1000, height = 240;
    const curves = results.map(result => {
      const points = result.regretCurve.map((regret, round) => {
        const x = width * round / settings.horizon;
        const y = height * (1 - regret / yMax);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      return `<polyline class="lab-line-${result.policy}" points="${points}" fill="none" vector-effect="non-scaling-stroke" stroke-width="2.6" stroke-dasharray="${policies[result.policy].dash}"/>`;
    }).join('');
    const yTicks = [1, 0.75, 0.5, 0.25, 0];
    const xTicks = [...new Set([0, Math.round(settings.horizon / 2), settings.horizon])];
    return `<figure class="lab-chart">
      <figcaption><strong>Mean across ${settings.repetitions} ${settings.repetitions === 1 ? 'run' : 'runs'}</strong><span>${results.map(r => `<span class="lab-key"><i class="lab-swatch lab-line-${r.policy}" aria-hidden="true"></i>${policies[r.policy].short}</span>`).join('')}</span></figcaption>
      <div class="lab-plot" role="img" aria-label="Mean cumulative pseudo-regret by round. ${results.map(r => `${policies[r.policy].short} finishes at ${format(r.regretCurve[settings.horizon])}.`).join(' ')}">
        <div class="lab-y-ticks" aria-hidden="true">${yTicks.map(ratio => `<span style="top:${100*(1-ratio)}%">${format(yMax*ratio)}</span>`).join('')}</div>
        <div class="lab-plot-area"><svg aria-hidden="true" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          ${yTicks.map(ratio => `<line class="lab-grid-line" x1="0" x2="${width}" y1="${height*ratio}" y2="${height*ratio}" vector-effect="non-scaling-stroke"/>`).join('')}${curves}
        </svg><div class="lab-x-ticks" aria-hidden="true">${xTicks.map(round => `<span style="left:${100*round/settings.horizon}%">${round}</span>`).join('')}</div></div>
      </div><div class="lab-axis-label">Round</div>
      ${peak === 0 ? '<p class="lab-zero">All selected policies have zero cumulative pseudo-regret in this experiment.</p>' : ''}
    </figure>`;
  }

  function policySummary(settings, results) {
    const best = Math.max(...settings.means);
    const tbody = results.map(result => {
      const bestPulls = result.meanPulls.reduce((total, pulls, i) => total + (settings.means[i] === best ? pulls : 0), 0);
      return `<tr><th scope="row">${policies[result.policy].short}</th>
        <td>${format(result.regretCurve[settings.horizon])}</td><td>${format(result.meanTotalReward)}</td>
        <td>${format(100*bestPulls/settings.horizon)}%</td></tr>`;
    }).join('');
    return `<div class="lab-table-wrap"><table class="lab-table"><caption>Mean outcomes after ${settings.horizon} rounds</caption><thead><tr><th scope="col">Policy</th><th scope="col">Pseudo-regret</th><th scope="col">Total reward</th><th scope="col">Best-arm plays</th></tr></thead><tbody>${tbody}</tbody></table></div>
      <p class="lab-run-description">Seed ${settings.seed} · Arm means ${settings.means.join(', ')}${settings.policies.includes('etc') ? ` · ${settings.m} ETC pulls per arm` : ''}</p>`;
  }

  function inspector(settings, results) {
    const armRows = settings.means.map((mean, arm) => `<tr><th scope="row">Arm ${arm+1}</th><td>${mean}</td>${results.map(r => `<td>${format(r.meanPulls[arm])}</td>`).join('')}</tr>`).join('');
    return `<div class="lab-detail-grid">
      <section class="lab-panel"><h2>Arm allocation</h2><p>Average number of pulls of each arm per run.</p>
        <div class="lab-table-wrap"><table class="lab-table"><caption class="sr-only">Mean pulls per arm by policy</caption><thead><tr><th scope="col">Arm</th><th scope="col">Mean</th>
        ${results.map(r => `<th scope="col">${policies[r.policy].short}</th>`).join('')}</tr></thead><tbody>${armRows}</tbody></table></div>
      </section>
      <section class="lab-panel"><h2>Inspect a round</h2><p>Follow the first repetition one decision at a time.</p>
        <div class="lab-round-control"><button type="button" id="lab-prev" class="small-button">Previous</button>
        <label for="lab-round">Round <output id="lab-round-output" for="lab-round">1</output> of ${settings.horizon}</label>
        <button type="button" id="lab-next" class="small-button">Next</button></div>
        <input type="range" id="lab-round" min="1" max="${settings.horizon}" step="1" value="1">
        <div id="lab-round-data" class="lab-table-wrap"></div>
      </section>
    </div>`;
  }

  function mount(root) {
    const form = root.querySelector('#lab-form');
    const status = root.querySelector('#lab-status');
    const error = root.querySelector('#lab-error');
    const mInput = form.querySelector('#lab-m');
    const etcInput = form.querySelector('#lab-policy-etc');
    const runButton = form.querySelector('#lab-run');

    function showRound(settings, results) {
      const slider = root.querySelector('#lab-round');
      const round = Number(slider.value);
      root.querySelector('#lab-round-output').textContent = round;
      root.querySelector('#lab-prev').disabled = round === 1;
      root.querySelector('#lab-next').disabled = round === settings.horizon;
      const rows = results.map(result => {
        const entry = result.trace[round-1];
        return `<tr><th scope="row">${policies[result.policy].short}</th><td>${entry.arm+1}</td><td>${entry.reward}</td><td>${format(entry.cumulativeRegret)}</td></tr>`;
      }).join('');
      root.querySelector('#lab-round-data').innerHTML = `<table class="lab-table"><caption class="sr-only">Observed decisions and cumulative pseudo-regret in repetition one, round ${round}</caption>
        <thead><tr><th scope="col">Policy</th><th scope="col">Arm</th><th scope="col">Reward</th><th scope="col">Pseudo-regret to date</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    function run() {
      form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
      error.hidden = true;
      let settings;
      try {
        settings = readSettings(form);
      } catch (problem) {
        error.textContent = problem.message;
        error.hidden = false;
        (form.querySelector('[aria-invalid]') || form.querySelector('#lab-policy-ucb')).focus();
        return;
      }
      const {results} = window.BanditExperiment.run(settings);
      root.querySelector('#lab-chart').innerHTML = chart(settings, results);
      root.querySelector('#lab-summary').innerHTML = policySummary(settings, results);
      root.querySelector('#lab-inspector').innerHTML = inspector(settings, results);
      const slider = root.querySelector('#lab-round');
      const update = () => showRound(settings, results);
      slider.addEventListener('input', update);
      for (const [id, step] of [['lab-prev', -1], ['lab-next', 1]]) {
        root.querySelector('#'+id).addEventListener('click', () => {
          slider.value = Number(slider.value) + step;
          update();
        });
      }
      update();
      status.textContent = `Showing ${settings.repetitions} ${settings.repetitions === 1 ? 'run' : 'runs'} of ${settings.horizon} rounds with seed ${settings.seed}.`;
      runButton.textContent = 'Run experiment';
    }

    function markChanged() {
      mInput.disabled = !etcInput.checked;
      error.hidden = true;
      status.textContent = 'Settings changed. Run again to update the results.';
      runButton.textContent = 'Run with these settings';
    }
    form.addEventListener('input', markChanged);
    form.addEventListener('submit', event => {
      event.preventDefault();
      run();
    });
    form.querySelectorAll('[data-lab-means]').forEach(button => {
      button.addEventListener('click', () => {
        form.querySelector('#lab-means').value = button.dataset.labMeans;
        markChanged();
      });
    });
    run();
  }

  window.BanditLab = {render, mount};
})();

