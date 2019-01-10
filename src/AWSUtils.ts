import { CloudFormation } from "aws-sdk";

/**
 * Result of the findExports method.
 */
export interface FindExportsResults {
    /**
     * The CloudFormation exports that were found.
     */
    exports: CloudFormation.Export[];
    /**
     * The exports that were not found on CloudFormation.
     */
    unFoundExports: string[];
}

/**
 * Finds the export from the given CloudFormation object.
 * @param cf
 * @param exportName
 * @returns An object containing the exports that were found.
 */
export async function findExports(cf: CloudFormation, exportNames: string[] = []): Promise<FindExportsResults> {
    const unfoundedNames: string[] = exportNames.slice();
    const foundExports: CloudFormation.Export[] = [];
    let NextToken: any;
    do {
        const cfExports = await cf.listExports().promise();
        NextToken = cfExports.NextToken;

        const unfounded = unfoundedNames.slice();
        for (const name of unfounded) {
            const foundExport = cfExports.Exports.find((e) => e.Name === name);
            if (foundExport) {
                foundExports.push(foundExport);
                unfoundedNames.splice(unfoundedNames.indexOf(name), 1);
            }
        }
    } while (NextToken && unfoundedNames.length > 0);

    return {
        exports: foundExports,
        unFoundExports: unfoundedNames
    };
}