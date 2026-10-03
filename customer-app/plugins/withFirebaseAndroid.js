const {
  withAppBuildGradle,
  withProjectBuildGradle,
} = require('@expo/config-plugins');

const GOOGLE_SERVICES_PLUGIN = 'com.google.gms:google-services:4.5.0';
const FIREBASE_BOM = 'com.google.firebase:firebase-bom:34.19.0';
const FIREBASE_ANALYTICS = 'com.google.firebase:firebase-analytics';

function withGoogleServicesClasspath(config) {
  return withProjectBuildGradle(config, (config) => {
    const { language } = config.modResults;
    let contents = config.modResults.contents;

    const existingClasspath = /(\bclasspath[ \t]*\(?[ \t]*)(['"])com\.google\.gms:google-services:[^'"]+\2([ \t]*\)?)/;
    if (existingClasspath.test(contents)) {
      contents = contents.replace(existingClasspath, (_match, prefix, quote, suffix) => `${prefix}${quote}${GOOGLE_SERVICES_PLUGIN}${quote}${suffix}`);
    } else if (!contents.includes(GOOGLE_SERVICES_PLUGIN)) {
      const buildscriptDependencies = /(buildscript\s*\{[\s\S]*?\bdependencies\s*\{)/;
      if (!buildscriptDependencies.test(contents)) {
        throw new Error('Could not find the project-level Gradle buildscript dependencies block for Google Services.');
      }
      contents = contents.replace(
        buildscriptDependencies,
        `$1\n        classpath("${GOOGLE_SERVICES_PLUGIN}")`
      );
    }

    config.modResults.contents = contents;
    if (language !== 'groovy' && language !== 'kotlin') {
      throw new Error(`Unsupported Android Gradle file language: ${language}`);
    }
    return config;
  });
}

function withFirebaseAnalytics(config) {
  return withAppBuildGradle(config, (config) => {
    const { language } = config.modResults;
    let contents = config.modResults.contents;
    const googleServicesPlugin = language === 'kotlin'
      ? '    id("com.google.gms.google-services")'
      : "apply plugin: 'com.google.gms.google-services'";

    if (!contents.includes('com.google.gms.google-services')) {
      const applicationPluginLine = /^\s*(?:apply plugin:\s*['"]com\.android\.application['"]|id\s*\(?\s*['"]com\.android\.application['"]\s*\)?).*$/m;
      if (!applicationPluginLine.test(contents)) {
        throw new Error('Could not find the Android application plugin line to apply Google Services.');
      }
      contents = contents.replace(applicationPluginLine, `$&\n${googleServicesPlugin}`);
    }

    if (!contents.includes(FIREBASE_ANALYTICS)) {
      const firebaseDependencies = language === 'kotlin'
        ? `\n    implementation(platform("${FIREBASE_BOM}"))\n    implementation("${FIREBASE_ANALYTICS}")`
        : `\n    implementation platform("${FIREBASE_BOM}")\n    implementation "${FIREBASE_ANALYTICS}"`;
      const dependenciesBlock = /\bdependencies\s*\{/;
      if (!dependenciesBlock.test(contents)) {
        throw new Error('Could not find the app-level Gradle dependencies block for Firebase Analytics.');
      }
      contents = contents.replace(dependenciesBlock, (match) => `${match}${firebaseDependencies}`);
    }

    config.modResults.contents = contents;
    if (language !== 'groovy' && language !== 'kotlin') {
      throw new Error(`Unsupported Android Gradle file language: ${language}`);
    }
    return config;
  });
}

module.exports = (config) => withFirebaseAnalytics(withGoogleServicesClasspath(config));
