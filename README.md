# serverless-transfer-cf-outputs-plugin

This Serverless plugin will transfer CloudFormation output variables from one region to another.

Why would you want to do this?

In case you have a resource that only exists in one region, but you have resources in other regions which
want talk to this resource. You can output the ARN or URL of that resource like you normally would, this
plugin will import them to other Serverless projects.

# How

Say you have a Redshift server in the `us-east-1`.  The `serverless.yml` would be something like this:

serverless.yml
```
provider:
    ...
    region: us-east-1
    ...

resources:
    Resources:
        myRedshift:
            Type: "AWS::Redshift::Cluster"
            Properties:
                AutomatedSnapshotRetentionPeriod: 7
                ClusterType: "single-node"
                DBName: "mydatabase"
                MasterUsername: "master_user"
                MasterUserPassword: ${ssm:super-secret-password~true}
                NodeType: dc2.large
                ... Further properties

    Outputs:
        RedshiftAddress:
            Value:
                Fn::GetAtt:
                    - myRedshift
                    - Endpoint.Address
            Export:
                Name: redshift-MyRedshiftAddress

            RedshiftPort:
            Value:
                Fn::GetAtt:
                    - myRedshift
                    - Endpoint.Port
            Export:
                Name: redshift-MyRedshiftPort
```

This is only going to be deployed in one region. It's annoying because the
address of this can not be guessed or you have to manually hunt it down
and hardcode it in other `serverless.yml` files which are multi-region.

That's where this plugin comes in.  You can create a multi-region
Serverless package and import both the port and address of the redshift server.

serverless.yml
```
plugins:
  - "@xapp/serverless-transfer-cf-outputs-plugin"

config:
    cfTransfer:
        regions:
            - region: us-east-1
              cfOutputs:
                - redshift-MyRedshiftAddress
                - redshift-MyRedshiftPort

functions:

    myLambdaWhichTalksToRedshift:
        handler: Handler.handler
        role: MyLambdaWhichTalksToRedshiftRole
        environment:
            REDSHIFT_ADDRESS:
                Fn::ImportValue: redshift-MyRedshiftAddress
            REDSHIFT_PORT:
                Fn::ImportValue: redshift-MyRedshiftPort

... The remaining setup.
```

If deploying in regions other than `us-east-1`, the plugin will scan the `serverless.yml`
file and replace the `Fn::ImportValue` statements with the correct exported value from the
`us-east-1` Cloudformation stack.

# Config

The `config` for this plugin must always be `cfTransfer`. The full details are:

```
config:
   cfTransfer:
    config:
      ## Optional: This is the profile which has access to the Cloudformation stack. If not provided, then `default` is used.
      awsProfile: <profile>
    regions:
          ## Required: This is the region the values are exported from.
        - region: <region>
          ## Required: These are the values which are to be imported from the Cloudformation stacks.
          cfOutputs:
            - <output>
```