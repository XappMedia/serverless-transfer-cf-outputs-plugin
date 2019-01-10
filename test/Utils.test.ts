import * as chai from "chai";
import * as Utils from "../src/Utils";

const expect = chai.expect;

describe("Utils", () => {
    describe("Throws error", () => {
        it("Tests that the error is thrown", () => {
            let caughtError: Error;
            try {
                Utils.throwError("Test Error");
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.exist;
            expect(caughtError.message.endsWith("Test Error")).to.be.true;
        });
    });

    describe("replaceImports", () => {
        const testExports = [{
            Name: "Export1",
            Value: "Value1"
        }, {
            Name: "Export2",
            Value: "Value2"
        },
        {
            Name: "Export3",
            Value: "Value3"
        }];

        it("Tests that no parameters are handled properly", () => {
            let caughtError: Error;
            try {
                Utils.replaceImports();
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.be.undefined;
        });

        it("Tests that undefined object is handled properly", () => {
            let caughtError: Error;
            try {
                Utils.replaceImports(testExports);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.be.undefined;
        });

        it("Tests that object with no imports is not changed.", () => {
            const obj = {
                param1: "Test",
                param2: {
                    param3: "Test",
                    param4: {
                        param5: 5
                    }
                }
            };
            Utils.replaceImports(testExports, obj);
            expect(obj).to.deep.equal({
                param1: "Test",
                param2: {
                    param3: "Test",
                    param4: {
                        param5: 5
                    }
                }
            });
        });

        it("Tests that object with imports is updated.", () => {
            const obj = {
                param1: {
                    "Fn::ImportValue": "Export1"
                },
                unchangedParam1: "Test",
                param2: {
                    param3: {
                        "Fn::ImportValue": "Export2"
                    },
                    unchangedParam2: "Test",
                    param4: {
                        param5: {
                            "Fn::ImportValue": "Export3"
                        },
                        unchangedParam3: 3
                    }
                }
            };
            Utils.replaceImports(testExports, obj);
            expect(obj).to.deep.equal({
                param1: "Value1",
                unchangedParam1: "Test",
                param2: {
                    param3: "Value2",
                    unchangedParam2: "Test",
                    param4: {
                        param5: "Value3",
                        unchangedParam3: 3
                    }
                }
            });
        });
    });
});