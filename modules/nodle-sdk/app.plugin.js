/**
 * Expo config plugin — adds the Nodle Maven repository to the project's
 * Android Gradle scripts so `io.nodle:nodlesdk-rc-lp:<rev>` resolves.
 *
 * Why this is required:
 *   The Nodle artifacts live at `http://maven.nodle.io` (HTTP, not HTTPS) and
 *   must be allowed via `allowInsecureProtocol = true`. Without this plugin,
 *   `expo prebuild` would regenerate the `android/` folder without the repo
 *   and the native module's Gradle resolution would fail to find Nodle.
 *
 * What it does:
 *   1. Inserts the maven block into root `android/build.gradle` →
 *      `allprojects { repositories { ... } }`.
 *   2. If a `dependencyResolutionManagement` block exists in
 *      `android/settings.gradle` (newer Gradle templates), inject there too.
 *   3. Adds app-level packaging options for Bouncy Castle duplicate resources.
 *
 * Idempotent — running prebuild multiple times will not duplicate the entry.
 *
 * Reference: https://docs.nodle.com/nodle-android-sdk
 */

const { withGradleProperties, withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

const NODLE_MARKER = 'maven.nodle.io';

const NODLE_REPO_BLOCK = `
        maven {
            url "http://maven.nodle.io"
            allowInsecureProtocol = true
        }`;

const APP_PACKAGING_OPTIONS = {
  'android.packagingOptions.pickFirsts': [
    'META-INF/versions/9/OSGI-INF/MANIFEST.MF',
    'META-INF/BCKEY.DSA',
    'META-INF/BCKEY.SF',
    'META-INF/BCKEY.RSA',
  ],
  'android.packagingOptions.excludes': [
    'META-INF/LICENSE.md',
    'META-INF/NOTICE.md',
    'META-INF/DEPENDENCIES',
  ],
};

function injectIntoAllProjects(contents) {
  if (contents.includes(NODLE_MARKER)) return contents;
  // Match: allprojects { ... repositories { ...
  const re = /(allprojects\s*\{[\s\S]*?repositories\s*\{)/;
  if (!re.test(contents)) return contents;
  return contents.replace(re, `$1${NODLE_REPO_BLOCK}`);
}

function injectIntoDependencyResolution(contents) {
  if (contents.includes(NODLE_MARKER)) return contents;
  const re = /(dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{)/;
  if (!re.test(contents)) return contents;
  return contents.replace(re, `$1${NODLE_REPO_BLOCK}`);
}

function mergeDelimitedGradleProperty(properties, key, values) {
  const property = properties.find((item) => item.type === 'property' && item.key === key);
  const existingValues = property
    ? property.value.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
  const mergedValues = Array.from(new Set([...existingValues, ...values]));

  if (property) {
    property.value = mergedValues.join(',');
  } else {
    properties.push({
      type: 'property',
      key,
      value: mergedValues.join(','),
    });
  }
}

const withNodleMaven = (config) => {
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = injectIntoAllProjects(cfg.modResults.contents);
    }
    return cfg;
  });

  config = withSettingsGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = injectIntoDependencyResolution(cfg.modResults.contents);
    }
    return cfg;
  });

  config = withGradleProperties(config, (cfg) => {
    for (const [key, values] of Object.entries(APP_PACKAGING_OPTIONS)) {
      mergeDelimitedGradleProperty(cfg.modResults, key, values);
    }
    return cfg;
  });

  return config;
};

module.exports = withNodleMaven;
