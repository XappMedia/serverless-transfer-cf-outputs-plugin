import { Serverless } from "@xapp/serverless-plugin-types";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as AWSUtils from "../src/AWSUtils";
import Plugin, { Custom } from "../src/ServerlessPlugin";

chai.use(sinonChai);
const expect = chai.expect;

const baseServerless: Serverless<Custom> = {
    service: {},
    cli: {
        log: sinon.stub()
    }
};

describe("ServerlessPlugin", () => {

    let findExportsStub: sinon.SinonStub;

    before(() => {
        findExportsStub = sinon.stub(AWSUtils, "findExports");
    });

    beforeEach(() => {
        findExportsStub.resetBehavior();
        findExportsStub.resetHistory();
        findExportsStub.returns(Promise.resolve({
            exports: [{ Name: "Output1", Value: "Value1"}, { Name: "Output2", Value: "Value2"}],
            unFoundExports: [] }));
    });

    after(() => {
        findExportsStub.restore();
    });

    it("Tests that an error is thrown if there is no parameters listed.", async () => {
        const plugin = new Plugin(baseServerless, {});
        await checkError(() => plugin.hooks["before:aws:deploy:deploy:createStack"]());
    });

    it("Tests that an error is thrown if regions are provided.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            custom: {
                cfTransfer: {
                    regions: [undefined]
                }
            }
        };

        const plugin = new Plugin(serverless, {});
        await checkError(() => plugin.hooks["before:aws:deploy:deploy:createStack"]());
    });

    it("Tests that an error is thrown if one of the regions does not have a origin.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            custom: {
                cfTransfer: {
                    regions: [{
                        region: undefined,
                        cfOutputs: ["Output1"]
                    }]
                }
            }
        };
        const plugin = new Plugin(serverless, {});
        await checkError(() => plugin.hooks["before:aws:deploy:deploy:createStack"]());
    });

    it("Tests that everything still works if regions are not provided.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            functions: {
                testFunction: {
                    name: "TestFunction1",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output1"
                    }
                },
                testFunction2: {
                    name: "TestFunction2",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output2"
                    }
                }
            },
            custom: {
                cfTransfer: {
                    regions: undefined
                }
            }
        };

        const plugin = new Plugin(serverless, {});
        await plugin.hooks["before:aws:deploy:deploy:createStack"]();

        // Made it here so no crash and serverless was untouched.
        expect(serverless.service).to.deep.equal({
            functions: {
                testFunction: {
                    name: "TestFunction1",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output1"
                    }
                },
                testFunction2: {
                    name: "TestFunction2",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output2"
                    }
                }
            },
            custom: {
                cfTransfer: {
                    regions: undefined
                }
            }
        });
    });

    it("Tests that an everything is skipped if the origin region matches the current region.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            provider: {
                name: "Doesn't matter",
                deploymentBucket: {
                    name: "Doesn't matter"
                },
                runtime: "Doesn't matter",
                region: "us-east-1"
            },
            functions: {
                testFunction: {
                    name: "TestFunction1",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output1"
                    }
                },
                testFunction2: {
                    name: "TestFunction2",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output2"
                    }
                }
            },
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            }
        };

        const plugin = new Plugin(serverless, {});
        await plugin.hooks["before:aws:deploy:deploy:createStack"]();

        expect(findExportsStub).to.not.have.been.called;
    });

    it("Tests that an error is thrown if not all the exports were found at the region.", async () => {
        const serverless = { ...baseServerless };
        serverless.service = {
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            }
        };

        findExportsStub.returns({
            exports: [{ Name: "Output1", Value: "Value1"}],
            unFoundExports: ["Output2"]});

        const plugin = new Plugin(serverless, {});
        await checkError(() => plugin.hooks["before:aws:deploy:deploy:createStack"]());
    });

    it("Tests that the functions is updated with the exports.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            functions: {
                testFunction: {
                    name: "TestFunction1",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output1"
                    }
                },
                testFunction2: {
                    name: "TestFunction2",
                    handler: "test.handler",
                    role: {
                        "Fn::ImportValue": "Output2"
                    }
                }
            },
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            }
        };

        const plugin = new Plugin(serverless, {});
        await plugin.hooks["before:aws:deploy:deploy:createStack"]();

        expect(serverless.service).to.deep.equal({
            functions: {
                testFunction: {
                    name: "TestFunction1",
                    handler: "test.handler",
                    role: "Value1"
                },
                testFunction2: {
                    name: "TestFunction2",
                    handler: "test.handler",
                    role: "Value2"
                }
            },
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            }
        });
    });

    it("Tests that the custom is updated with the exports.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            custom: {
                anotherAttrib: {
                    param1: {
                        "Fn::ImportValue": "Output1"
                    }
                },
                yetAnotherAttrib: {
                    param2: {
                        param3: {
                            "Fn::ImportValue": "Output2"
                        }
                    }
                },
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            }
        };

        const plugin = new Plugin(serverless, {});
        await plugin.hooks["before:aws:deploy:deploy:createStack"]();

        expect(serverless.service).to.deep.equal({
            custom: {
                anotherAttrib: {
                    param1: "Value1"
                },
                yetAnotherAttrib: {
                    param2: {
                        param3: "Value2"
                    }
                },
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            }
        });
    });

    it("Tests that the resources is updated with the exports.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            },
            resources: {
                Resources: {
                    resource1: {
                        type: "aws::something",
                        parameter: {
                            "Fn::ImportValue": "Output1"
                        }
                    }
                }
            }
        };

        const plugin = new Plugin(serverless, {});
        await plugin.hooks["before:aws:deploy:deploy:createStack"]();

        expect(serverless.service).to.deep.equal({
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            },
            resources: {
                Resources: {
                    resource1: {
                        type: "aws::something",
                        parameter: "Value1"
                    }
                }
            }
        });
    });

    it("Tests that the Provider is updated with the exports.", async () => {
        const serverless = {...baseServerless};
        serverless.service = {
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            },
            provider: {
                name: "test",
                runtime: "does not matter",
                deploymentBucket: {
                    name: "TestBucket"
                },
                apiGateway: {
                    restApiId: {
                        "Fn::ImportValue": "Output2"
                    },
                    restApiResources: {
                        "/test": {
                            "Fn::ImportValue": "Output2"
                        }
                    },
                    restApiRootResourceId: {
                        "Fn::ImportValue": "Output2"
                    }
                }
            }
        };

        const plugin = new Plugin(serverless, {});
        await plugin.hooks["before:aws:deploy:deploy:createStack"]();

        expect(serverless.service).to.deep.equal({
            custom: {
                cfTransfer: {
                    regions: [{
                        region: "us-east-1",
                        cfOutputs: ["Output1", "Output2"]
                    }]
                }
            },
            provider: {
                name: "test",
                runtime: "does not matter",
                deploymentBucket: {
                    name: "TestBucket"
                },
                apiGateway: {
                    restApiId: "Value2",
                    restApiResources: {
                        "/test": "Value2"
                    },
                    restApiRootResourceId: "Value2"
                }
            }
        });
    });
});

async function checkError(callback: () => void | any | Promise<void> | Promise<any>) {
    let caughtError: Error;
    try {
        await Promise.resolve(callback());
    } catch (e) {
        caughtError = e;
    }

    expect(caughtError).to.exist;
}