#!/bin/sh

# Setup issuer configuration

# Install important node modules for this script
npm install -g fs
npm install -g minimist

# Define all file locations that are relevant for setup
jsonCli=$PWD/bin/json.js
configFile=$PWD/src/issuer-config.json

# Define all config keys
issuerNameKey=ISSUER_NAME
issuerUrlKey=ISSUER_URL
issuerStreetKey=ISSUER_STREET
issuerCityKey=ISSUER_CITY
issuerStateKey=ISSUER_STATE
issuerZipKey=ISSUER_ZIP

# Setup config file
echo {} > $configFile

echo Beginning issuer configuration...

printf "Please enter the official name of your learning institution [ENTER]:\n---> "
read issuerName
printf "Please enter the official website of your learning institution [ENTER]:\n---> "
read issuerUrl
printf "Please enter the street address of your learning institution [ENTER]:\n---> "
read issuerStreet
printf "Please enter the city of your learning institution  [ENTER]:\n---> "
read issuerCity
printf "Please enter the state of your learning institution [ENTER]:\n---> "
read issuerState
printf "Please enter the postal code of your learning institution [ENTER]:\n---> "
read issuerZip
node $jsonCli --write --key=$issuerNameKey --value="$issuerName" --json=$configFile
node $jsonCli --write --key=$issuerUrlKey --value="$issuerUrl" --json=$configFile
node $jsonCli --write --key=$issuerStreetKey --value="$issuerStreet" --json=$configFile
node $jsonCli --write --key=$issuerCityKey --value="$issuerCity" --json=$configFile
node $jsonCli --write --key=$issuerStateKey --value="$issuerState" --json=$configFile
node $jsonCli --write --key=$issuerZipKey --value="$issuerZip" --json=$configFile

echo Finished issuer configuration! You may rerun this script if you have entered a value in error or if a value is updated in the future. Finally, make sure that the newly generated issuer-config.json file located under the src directory is uploaded to the root of this project in the deployment environment where you will be hosting this service.

echo Issuer config:
cat $configFile
