/* eslint-disable no-console */
const fs = require('fs');
const semver = require('semver');
const childProcess = require('child_process');
const { execSync } = childProcess;

// Checks that current Node and npm versions satisfy requirements in package.json
// To run manually: node check-version.js [verbose]

const VERBOSE_FORCED = false;
const args = process.argv.slice(2);
const VERBOSE = VERBOSE_FORCED || (args.length > 0 && args[0] === 'verbose');

const printErrAndExit = (message) => {
  console.error(`Error: ${message}`);
  console.error('Aborting');
  process.exit(1);
};

const getPackageJson = () => {
  try {
    const packageJson = fs.readFileSync('./package.json', 'utf8');
    return JSON.parse(packageJson);
  } catch (error) {
    printErrAndExit('Failed to read or parse package.json');
  }
};

const checkNpmVersion = (npmVersionRequired) => {
  if (!npmVersionRequired) {
    console.log('No required npm version specified');
    return;
  }

  try {
    const npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
    if (VERBOSE) console.log(`npm required: '${npmVersionRequired}' - current: '${npmVersion}'`);

    if (!semver.satisfies(npmVersion, npmVersionRequired)) {
      printErrAndExit(`Required npm version '${npmVersionRequired}' not satisfied. Current: '${npmVersion}'.`);
    }
  } catch (error) {
    printErrAndExit('Failed to check npm version');
  }
};

const checkYarnVersion = (yarnVersionRequired) => {
  if (!yarnVersionRequired) {
    console.log('No required Yarn version specified');
    return;
  }

  try {
    const yarnVersion = execSync('yarn -v', { encoding: 'utf8' }).trim();
    if (VERBOSE) console.log(`Yarn required: '${yarnVersionRequired}' - current: '${yarnVersion}'`);

    if (!semver.satisfies(yarnVersion, yarnVersionRequired)) {
      printErrAndExit(`Required Yarn version '${yarnVersionRequired}' not satisfied. Current: '${yarnVersion}'.`);
    }
  } catch (error) {
    printErrAndExit('Failed to check Yarn version');
  }
};

const checkNodeVersion = (nodeVersionRequired) => {
  if (!nodeVersionRequired) {
    console.log('No required node version specified');
    return;
  }

  const nodeVersion = process.version;
  if (VERBOSE) console.log(`node required: '${nodeVersionRequired}' - current: '${nodeVersion}'`);

  if (!semver.satisfies(nodeVersion, nodeVersionRequired)) {
    printErrAndExit(`Required node version '${nodeVersionRequired}' not satisfied. Current: '${nodeVersion}'.`);
  }
};

const sanitizeNodeVersion = (version) => {
  // Remove any range specifiers (e.g., >=, ^, ~) from the version string
  return version.replace(/[>=^~]/g, '');
};


const checkAndUseNVM = () => {
  try {
    // Check if NVM is installed
    execSync('$NVM_DIR/nvm.sh --version', { stdio: 'ignore' });

    let nodeVersionToUse;
    try {
      // If nvm is installed, use the node version specified in .nvmrc
      nodeVersionToUse = fs.readFileSync('.nvmrc', 'utf8').trim();
      console.log(`Using Node version from .nvmrc: ${nodeVersionToUse}`);
    } catch (error) {
      // If .nvmrc doesn't exist, use the node version specified in package.json
      const json = getPackageJson();
      if (json.engines?.node) {
        nodeVersionToUse = json.engines.node;
        console.log(`Using Node version from package.json: ${nodeVersionToUse}`);
      } else {
        console.log(".nvmrc not found and package.json doesn't specify a Node version. Global version will be used.");
        return false;
      }
    }

   // Sanitize the version string to remove range specifiers
   const sanitizedVersion = sanitizeNodeVersion(nodeVersionToUse);
   //console.log('Sanitized Node version to use:', sanitizedVersion);

   // Use the sanitized version with NVM
   execSync(`$NVM_DIR/nvm.sh use "${sanitizedVersion}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    if (VERBOSE) console.log('NVM not found or error using NVM:', error.message);
    console.log('NVM not found. Using global Node version.');
    return false;
  }
};

const main = () => {
  const json = getPackageJson();
  if (!json.engines) printErrAndExit('No engines entry in package.json');

  const usedNvm = checkAndUseNVM();
  if (!usedNvm) {
    checkNodeVersion(json.engines.node);
    checkNpmVersion(json.engines.npm);
  } else {
    console.log('Verified versions (through NVM).');
  }

  // Check Yarn version if specified in package.json
  if (json.engines.yarn) {
    checkYarnVersion(json.engines.yarn);
  } else {
    console.log('No required Yarn version specified');
  }
};

main();
