/**
 * Expo Config Plugin to add missing Maven repositories for async-storage
 * This fixes the "org.asyncstorage:shared_storage:storage-android:1.0.0" error
 */
const { withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

function addMavenRepos(buildGradle) {
  // Check if repositories block exists in allprojects
  if (buildGradle.includes('allprojects')) {
    // Add the Sonatype repository for async-storage shared_storage
    const repoToAdd = `        maven { url "https://s01.oss.sonatype.org/content/repositories/releases/" }`;
    
    // Find allprojects { repositories { and add after google()/mavenCentral()
    const allProjectsRegex = /(allprojects\s*\{\s*repositories\s*\{[^}]*mavenCentral\(\))/;
    
    if (allProjectsRegex.test(buildGradle) && !buildGradle.includes('s01.oss.sonatype.org')) {
      buildGradle = buildGradle.replace(
        allProjectsRegex,
        `$1\n${repoToAdd}`
      );
    }
  }
  
  return buildGradle;
}

function addSettingsMavenRepos(settingsGradle) {
  // Add repository to dependencyResolutionManagement if it exists
  const repoToAdd = `        maven { url "https://s01.oss.sonatype.org/content/repositories/releases/" }`;
  
  const depResolutionRegex = /(dependencyResolutionManagement\s*\{[^}]*repositories\s*\{[^}]*mavenCentral\(\))/s;
  
  if (depResolutionRegex.test(settingsGradle) && !settingsGradle.includes('s01.oss.sonatype.org')) {
    settingsGradle = settingsGradle.replace(
      depResolutionRegex,
      `$1\n${repoToAdd}`
    );
  }
  
  return settingsGradle;
}

const withMavenRepositories = (config) => {
  // Modify android/build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addMavenRepos(config.modResults.contents);
    }
    return config;
  });
  
  // Modify android/settings.gradle
  config = withSettingsGradle(config, (config) => {
    config.modResults.contents = addSettingsMavenRepos(config.modResults.contents);
    return config;
  });
  
  return config;
};

module.exports = withMavenRepositories;
