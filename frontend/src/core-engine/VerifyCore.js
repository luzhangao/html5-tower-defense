/**
 * verifyCoreReplay - minimal deterministic verifier for CoreEngine.
 */
import CoreEngine from './EngineCore';

function verifyCoreReplay({ seed, rulesVersion, actions, finalTick, claimedScore, claimedLevel, debug }) {
  // 在本地复跑回放，用于开发或对齐逻辑
  const engine = new CoreEngine({ seed, rulesVersion, debug });
  engine.runWithActions(actions || []);
  if (typeof finalTick === 'number') {
    engine.runToTick(finalTick);
  }
  const finalState = engine.getFinalState();
  let valid = true;
  if (typeof claimedScore === 'number') {
    valid = valid && finalState.score === claimedScore;
  }
  if (typeof claimedLevel === 'number') {
    valid = valid && finalState.wave === claimedLevel;
  }
  let error = null;
  if (!valid) {
    if (typeof claimedScore === 'number' && finalState.score !== claimedScore) {
      error = 'Score mismatch';
    } else if (typeof claimedLevel === 'number' && finalState.wave !== claimedLevel) {
      error = 'Level mismatch';
    } else {
      error = 'Verification failed';
    }
  }
  return {
    valid,
    state: finalState,
    error
  };
}

export { verifyCoreReplay };
