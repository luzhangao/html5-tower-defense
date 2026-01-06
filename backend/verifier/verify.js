const express = require('express');
let Engine = null;

try {
  Engine = require('./engine-bundle.js');
} catch (error) {
  console.error('[verifier] engine bundle load failed:', error.message);
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: !!Engine });
});

app.post('/api/verify', (req, res) => {
  if (!Engine) {
    return res.status(500).json({
      valid: false,
      error: 'Verifier engine bundle missing. Run webpack.config.verifier.js to build.'
    });
  }

  try {
    const { seed, rulesVersion, actions, claimedScore, claimedLevel } = req.body;
    if (!seed || !rulesVersion || !actions) {
      return res.status(400).json({ valid: false, error: 'Missing required parameters' });
    }

    console.log('[verifier] verify request', {
      seed,
      rulesVersion,
      claimedScore,
      claimedLevel,
      actions: Array.isArray(actions) ? actions.length : 0
    });
    const result = Engine.verifyReplay({
      seed,
      rulesVersion,
      actions,
      claimedScore,
      claimedLevel
    });

    console.log('[verifier] verify result', result);
    res.json(result);
  } catch (error) {
    console.error('[verifier] error:', error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Verifier service running on port ${PORT}`);
});
