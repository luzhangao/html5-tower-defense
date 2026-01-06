const express = require('express');
let Core = null;

try {
  Core = require('./core-engine-bundle.js');
} catch (error) {
  console.error('[core-verifier] core bundle load failed:', error.message);
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', core: !!Core });
});

app.post('/api/verify-core', (req, res) => {
  if (!Core) {
    return res.status(500).json({
      valid: false,
      error: 'Core engine bundle missing. Run webpack.config.core-verifier.js to build.'
    });
  }

  try {
    const { seed, rulesVersion, actions, finalTick, claimedScore, claimedLevel, debug } = req.body;
    if (seed === undefined || seed === null) {
      return res.status(400).json({ valid: false, error: 'Missing seed' });
    }

    console.log('[core-verifier] verify request', {
      seed,
      rulesVersion,
      actions: Array.isArray(actions) ? actions.length : 0,
      finalTick,
      claimedScore,
      claimedLevel,
      debug: !!debug
    });

    const result = Core.verifyCoreReplay({
      seed,
      rulesVersion,
      actions,
      finalTick,
      claimedScore,
      claimedLevel
    });

    console.log('[core-verifier] verify result', result);
    res.json(result);
  } catch (error) {
    const detail = error && error.stack ? error.stack : String(error);
    console.error('[core-verifier] error:', detail);
    res.status(500).json({ valid: false, error: error.message || 'Verifier error', stack: detail });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Core verifier service running on port ${PORT}`);
});
