'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const electronApi = require('./electronApi');
const preloadInitializeFn = require('../renderer/electron-log-preload');

module.exports = {
  initialize({ logger, preload = true, spyRendererConsole = false }) {
    electronApi.whenAppReady()
      .then(() => {
        if (preload) {
          initializePreload(preload);
        }

        if (spyRendererConsole) {
          initializeSpyRendererConsole(logger);
        }
      })
      .catch(logger.warn);
  },
};

function initializePreload(preloadOption) {
  let preloadPath = typeof preloadOption === 'string'
    ? preloadOption
    : path.resolve(__dirname, '../renderer/electron-log-preload.js');

  if (!fs.existsSync(preloadPath)) {
    preloadPath = path.join(
      electronApi.getAppUserDataPath() || os.tmpdir(),
      'electron-log-preload.js',
    );
    const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
    fs.writeFileSync(preloadPath, preloadCode, 'utf8');
  }

  electronApi.setPreloadFileForSessions({ filePath: preloadPath });
}

function initializeSpyRendererConsole(logger) {
  const levels = ['verbose', 'info', 'warning', 'error'];
  electronApi.onEveryWebContentsEvent(
    'console-message',
    (event, level, message) => {
      logger.processMessage({
        data: [message],
        level: levels[level],
        variables: { processType: 'renderer' },
      });
    },
  );
}
