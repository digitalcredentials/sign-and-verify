#!/bin/sh

# Setup issuer configuration

# Install important node modules for this script
npm install -g fs
npm install -g minimist
npm install -g digitalcredentials/did-cli#main

# Define all file locations that are relevant for setup
jsonCli=$PWD/bin/json.js
configFile=$PWD/src/issuer-config.json
didTmpFile=$PWD/.did.tmp

# Define issuer config keys
issuerDidKey=ISSUER_DID
issuerNameKey=ISSUER_NAME
issuerUrlKey=ISSUER_URL
issuerImageKey=ISSUER_IMAGE

# Define did-cli keys
didKey=id
didSeedKey=secretKeySeed

# Setup config file
echo {} > $configFile

# Create did
did id create > $didTmpFile

echo [IMPORTANT] Please make sure you are running npm version 14 or later

echo Beginning issuer configuration...

read -p "Please enter the official name of your learning institution [ENTER]: " issuerName
read -p "Please enter the official website of your learning institution [ENTER]: " issuerUrl
read -p "Please enter a link to an image of the official logo of your learning institution [ENTER]: " issuerImage
read -p "Does your learning institution already own a secret DID seed you would like to use to generate your DID document (yes / no (default)) [ENTER]: " didSeedExists
didSeedExists=${didSeedExists:-no}

issuerDidSeed=""
if [ $didSeedExists == "yes" ]
then
  printf "Please enter the DID seed for your learning institution [ENTER]: "
  read issuerDidSeed
  SECRET_KEY_SEED=$issuerDidSeed did id create > $didTmpFile
else
  did id create > $didTmpFile
  issuerDidSeed=`node $jsonCli --read --key=$didSeedKey --json=$didTmpFile`
fi
issuerDid=`node $jsonCli --read --key=$didKey --json=$didTmpFile`

node $jsonCli --write --key=$issuerDidKey --value="$issuerDid" --json=$configFile
node $jsonCli --write --key=$issuerNameKey --value="$issuerName" --json=$configFile
node $jsonCli --write --key=$issuerUrlKey --value="$issuerUrl" --json=$configFile
node $jsonCli --write --key=$issuerImageKey --value="$issuerImage" --json=$configFile

echo
echo Finished issuer configuration!
echo

echo [IMPORTANT] Please follow these important instructions:
echo 1. Please save your DID seed \(see below\) under the environment variable "DID_SEED" in the deployment environment where you will be hosting this service. [IMPORTANT] DO NOT CHECK THIS VALUE INTO A PUBLICLY ACCESSIBLE SOURCE CONTROL MANAGEMENT SYSTEM. THIS IS A SENSITIVE ORGANIZATIONAL SECRET!
echo 2. Please upload the issuer config \(see below\) under the name "$(basename $configFile)" to the "src" directory of the project located in the deployment environment where you will be hosting this service. You do not need to upload this file to a publicly accessible source control management system. These are organization-specific values.
echo 3. You may rerun this script or modify the hosted "$(basename $configFile)" if you have entered a value in error or if a value is updated in the future.
echo

echo Issuer config:
cat $configFile
echo
echo

echo DID info:
echo DID: $issuerDid
echo DID seed: $issuerDidSeed
echo

echo Cleaning up unnecessary data...
git checkout $configFile
rm $didTmpFile
echo Done!
