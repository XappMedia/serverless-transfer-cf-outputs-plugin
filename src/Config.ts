export interface Config {
}

export interface CFOutputObject {
    /**
     *  The name of the imported value from CloudFormation.
     */
    name: string;
    /**
     * If exists, this will be the value if not found
     */
    defaultValue?: string;
}

export type CFOutput = string | CFOutputObject;

/**
 * The specifications for the AWS region.
 */
export interface Region {
    /**
     * The name of the AWS region that the outputs are in.
     */
    region: string;
    /**
     * The names of the imported values from CloudFormation.  In a serverless.yml file,
     * these will be denoted as such:
     *
     * `Fn::ImportValue: <output-name>`
     *
     * Where `output-name` is the name of the exported variable.
     */
    cfOutputs: CFOutput[];
}

export interface PluginParameters {
    /**
     * The regions in which to search for the exports.
     */
    regions: Region[];

    /**
     * Configuration parameters for the plugin.
     */
    config?: Config;
}

export default PluginParameters;