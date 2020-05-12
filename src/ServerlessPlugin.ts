import { CloudFormation, SharedIniFileCredentials } from "aws-sdk";
import * as Serverless from "serverless";
import * as Plugin from "serverless/classes/Plugin";
import { Hooks } from "serverless/classes/Plugin";
import { findExports } from "./AWSUtils";
import Transfer, { Config, Region } from "./Config";
import { replaceImports, throwError } from "./Utils";

export interface Custom {
    cfTransfer?: Transfer;
    [key: string]: any;
}

class ServerlessPlugin implements Plugin {

    private serverless: Serverless;
    hooks: Hooks;

    constructor(serverless: Serverless) {
        this.serverless = serverless;
        this.hooks = {
            "before:aws:deploy:deploy:createStack": this.updateImportsInServerless.bind(this),
        };
    }

    async updateImportsInServerless() {
        const custom: Custom = this.serverless.service.custom || {};

        const transfer = custom.cfTransfer;
        validateConfig(transfer);

        const regions = transfer.regions || [];
        const updatePromises = regions.map((r) => this.updateValues(r, transfer.config));
        await Promise.all(updatePromises);
    }

    async updateValues(region: Region, config: Config = {}) {
        const provider: { region?: string } = this.serverless.service.provider || {};
        if (provider.region === region.region) {
            // ALl imports are in the origin so continue on because everything will just workout.
            this.serverless.cli.log("Same region as provider. Skipping transfer.");
            return;
        }
        const cloudFormation = new CloudFormation({
            apiVersion: "2010-05-15",
            region: region.region,
            credentials: new SharedIniFileCredentials({
                profile: config.awsProfile || "default"
            })
        });

        const getExportsResults = await findExports(cloudFormation, region.cfOutputs);
        if (getExportsResults.unFoundExports.length) {
            throwError(`CloudFormation exports ${getExportsResults.unFoundExports.join(", ")} were not found in region ${region.region}.`);
        }

        replaceImports(getExportsResults.exports, this.serverless.service.provider);
        replaceImports(getExportsResults.exports, this.serverless.service.custom);
        replaceImports(getExportsResults.exports, (this.serverless.service as any).functions);
        replaceImports(getExportsResults.exports, (this.serverless.service as any).resources);
    }
}

function validateConfig(config: Transfer) {
    if (!config) {
        throwError("No configuration set on `cfTransfer` property of `custom`.");
    }
    const regions: Region[] = config.regions || [];
    regions.forEach((r) => validateRegion(r));
}

function validateRegion(region: Region) {
    if (!region) {
        throwError("Region does not exist.");
    }
    if (!region.region) {
        throwError("Region not specified in region object.");
    }
}

export default ServerlessPlugin;