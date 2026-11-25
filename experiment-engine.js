/* Seeded Bernoulli bandits. Public entry point: BanditExperiment.run(settings). */
(() => {
  'use strict';

  const policyIds = ['ucb', 'etc', 'uniform'];
  const policyStreamTags = { ucb: 0x77637102, etc: 0x82714447, uniform: 0xe3238275 };
  const rewardStreamTag = 0x613d2529;
  const wordRange = 0x100000000;

  function checkInteger(value, minimum, maximum, name) {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}.`);
    }
  }

  function validate({ means, horizon, repetitions, seed, m, policies }) {
    if (!Array.isArray(means) || means.length < 2 || means.length > 10 ||
        !Array.from(means).every(p => Number.isFinite(p) && p >= 0 && p <= 1)) {
      throw new RangeError('Choose 2 to 10 arm means between 0 and 1.');
    }
    checkInteger(horizon, means.length, 2000, 'Horizon');
    checkInteger(repetitions, 1, 100, 'Repetitions');
    checkInteger(seed, 0, 0xffffffff, 'Seed');
    checkInteger(m, 1, Math.floor(horizon / means.length), 'Exploration pulls per arm');
    if (!Array.isArray(policies) || !policies.length ||
        !Array.from(policies).every(id => policyIds.includes(id)) ||
        new Set(policies).size !== policies.length) {
      throw new RangeError('Choose one or more distinct policies from ucb, etc, and uniform.');
    }
  }

  // Separate the replication, reward, and policy streams using a 32-bit mixer.
  function mix(value) {
    let x = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return (x ^ (x >>> 16)) >>> 0;
  }

  function makeWordStream(seed) {
    let state = seed;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let x = Math.imul(state ^ (state >>> 15), state | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return (x ^ (x >>> 14)) >>> 0;
    };
  }

  // Compare successive base-2^32 digits at a boundary. Every finite binary64
  // probability terminates, including subnormals (at most 34 words).
  function drawReward(probability, nextWord) {
    let remainder = probability;
    while (true) {
      const scaled = remainder * wordRange;
      const digit = Math.floor(scaled);
      const word = nextWord();
      if (word !== digit || scaled === digit) return Number(word < digit);
      remainder = scaled - digit;
    }
  }

  // Multiply-high integer sampling. Reject the surplus words so each bucket
  // has the same size. Products are exact because the lab has at most 10 arms.
  function drawIndex(count, nextWord) {
    const surplus = wordRange % count;
    let product;
    do { product = nextWord() * count; } while (product % wordRange < surplus);
    return Math.floor(product / wordRange);
  }

  // Draw only the outcomes needed. All policies in one replication observe
  // the same outcome on their j-th pull of arm i, regardless of round.
  function makeArmRewards(means, replicationSeed) {
    return means.map((mean, arm) => {
      const nextWord = makeWordStream(mix(replicationSeed ^ rewardStreamTag ^ arm));
      const outcomes = [];
      return pullIndex => {
        while (outcomes.length <= pullIndex) outcomes.push(drawReward(mean, nextWord));
        return outcomes[pullIndex];
      };
    });
  }

  // Uniform tie breaking by reservoir sampling among the current maximizers.
  function chooseMaximum(scores, nextWord) {
    let best = 0;
    let ties = 1;
    for (let arm = 1; arm < scores.length; arm++) {
      if (scores[arm] > scores[best]) {
        best = arm;
        ties = 1;
      } else if (scores[arm] === scores[best]) {
        ties++;
        if (drawIndex(ties, nextWord) === 0) best = arm;
      }
    }
    return best;
  }

  // Policies have access only to counts and observed successes.
  function makePolicy(id, pulls, successes, horizon, m, nextWord) {
    const k = pulls.length;
    if (id === 'uniform') return () => drawIndex(k, nextWord);

    const scores = new Float64Array(k);
    if (id === 'etc') {
      let committedArm;
      return t => {
        if (t < m * k) return t % k;
        if (committedArm === undefined) {
          for (let i = 0; i < k; i++) scores[i] = successes[i] / pulls[i];
          committedArm = chooseMaximum(scores, nextWord);
        }
        return committedArm;
      };
    }

    // UCB(delta) in the notes, with delta = horizon^(-2).
    const confidence = 4 * Math.log(horizon);
    return () => {
      for (let i = 0; i < k; i++) {
        scores[i] = pulls[i] === 0
          ? Infinity
          : successes[i] / pulls[i] + Math.sqrt(confidence / pulls[i]);
      }
      return chooseMaximum(scores, nextWord);
    };
  }

  function simulate(result, settings, gaps, rewards, replicationSeed, recordTrace) {
    const { horizon, m } = settings;
    const pulls = new Uint32Array(gaps.length);
    const successes = new Uint32Array(gaps.length);
    const nextWord = makeWordStream(mix(replicationSeed ^ policyStreamTags[result.policy]));
    const choose = makePolicy(result.policy, pulls, successes, horizon, m, nextWord);
    let cumulativeRegret = 0;
    for (let t = 0; t < horizon; t++) {
      const arm = choose(t);
      const reward = rewards[arm](pulls[arm]);
      pulls[arm]++;
      successes[arm] += reward;
      cumulativeRegret += gaps[arm];
      result.regretCurve[t + 1] += cumulativeRegret;
      result.meanTotalReward += reward;
      if (recordTrace) result.trace.push({ round: t + 1, arm, reward, cumulativeRegret });
    }
    for (let i = 0; i < pulls.length; i++) result.meanPulls[i] += pulls[i];
  }

  function run(settings) {
    validate(settings);
    const { means, horizon, repetitions, seed, policies } = settings;
    const bestMean = Math.max(...means);
    const gaps = means.map(mean => bestMean - mean);
    const results = policies.map(policy => ({
      policy,
      regretCurve: Array(horizon + 1).fill(0),
      meanPulls: Array(means.length).fill(0),
      meanTotalReward: 0,
      trace: []
    }));
    for (let repetition = 0; repetition < repetitions; repetition++) {
      const replicationSeed = mix(seed + repetition);
      const rewards = makeArmRewards(means, replicationSeed);
      for (const result of results) {
        simulate(result, settings, gaps, rewards, replicationSeed, repetition === 0);
      }
    }
    for (const result of results) {
      result.regretCurve = result.regretCurve.map(sum => sum / repetitions);
      result.meanPulls = result.meanPulls.map(sum => sum / repetitions);
      result.meanTotalReward /= repetitions;
    }
    return { results };
  }

  window.BanditExperiment = Object.freeze({ run });
})();
