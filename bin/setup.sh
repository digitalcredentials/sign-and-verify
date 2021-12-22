#!/bin/sh

# Setup issuer configuration

# Install important node modules for this script
npm install -g fs
npm install -g minimist
npm install -g digitalcredentials/did-cli#main

# Define all file locations that are relevant for setup
jsonCli=$PWD/bin/json.js
didTmpFile=$PWD/.did.tmp

# Define did-cli keys
didKey=id
didSeedKey=secretKeySeed

# Create did
did id create > $didTmpFile

echo [IMPORTANT] Please make sure you are running npm version 14 or later

# Create did
did id create > $didTmpFile

echo [IMPORTANT] Please make sure you are running npm version 14 or later

echo Beginning issuer configuration...

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

echo
echo Finished issuer configuration!
echo

echo [IMPORTANT] Please save your DID seed \(see below\) under the environment variable "DID_SEED" in the deployment environment where you will be hosting this service.
echo [IMPORTANT] DO NOT CHECK THIS VALUE INTO A PUBLICLY ACCESSIBLE SOURCE CONTROL MANAGEMENT SYSTEM. THIS IS A SENSITIVE ORGANIZATIONAL SECRET!
echo

echo DID info:
echo DID seed: $issuerDidSeed
echo did:key: $issuerDid
echo

echo Cleaning up unnecessary data...
rm $didTmpFile
echo Done!
