import { Export } from "aws-sdk/clients/cloudformation";
import * as Serverless from "serverless";

/**
 * Utility method to throw an error with the tag appended to the front.
 * @param msg
 */
export function throwError(msg: string) {
    throw new Error(`CloudFormation Transfer Plugin: ${msg}`);
}

/**
 * Returns the profile that is set to the serverless function.
 * @param serverless
 */
export function getAwsProfile(serverless: Serverless) {
   return (serverless.providers as any)?.aws?.options?.awsProfile || "default";
}

/**
 * This will replace all the objects with keys 'Fn::ImportValue' with the implementation
 * in the provided exports.
 * @param cfExports
 * @param obj
 */
export function replaceImports(cfExports: Export[] = [], obj: any = {}) {
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value && typeof value === "object") {
            if (value["Fn::ImportValue"]) {
                // It's an import object.
                const cfExport = cfExports.find((e) => e.Name === value["Fn::ImportValue"]);
                if (cfExport) {
                    const foundExportValue = cfExport.Value;
                    obj[key] = foundExportValue;
                }
            } else {
                // Else it's an object we can traverse
                replaceImports(cfExports, value);
            }
        } // Else it's some other value we don't care about
    }
}