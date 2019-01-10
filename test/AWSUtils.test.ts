import { CloudFormation } from "aws-sdk";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as AWSUtils from "../src/AWSUtils";

chai.use(sinonChai);
const expect = chai.expect;

describe("AWSUtils", () => {
    describe("GetExports", () => {
        const cf = new CloudFormation();
        let listExportsStub: sinon.SinonStub;

        before(() => {
            listExportsStub = sinon.stub(cf, "listExports");
        });

        beforeEach(() => {
            listExportsStub.resetBehavior();
            listExportsStub.resetHistory();
            setExportsReturns({ Exports: [] });
        });

        function setExportsReturns(exportsReturn: CloudFormation.ListExportsOutput | CloudFormation.ListExportsOutput[]) {
            if (Array.isArray(exportsReturn)) {
                for (let i = 0; i < exportsReturn.length; i++) {
                    listExportsStub.onCall(i).returns({
                        promise: () => Promise.resolve(exportsReturn[i])
                    });
                }
            } else {
                listExportsStub.returns({
                    promise: () => Promise.resolve(exportsReturn)
                });
            }
        }

        it("Tests that an empty item is returned if no exports are provided.", async () => {
            const result = await AWSUtils.findExports(cf);
            expect(result).to.deep.equal({
                exports: [],
                unFoundExports: []
            });
        });

        it("Tests that an export is found.", async () => {
            const cfExports: CloudFormation.Export[] = [{
                Name: "Export1",
                Value: "Value1"
            }];
            setExportsReturns({ Exports: cfExports });
            const result = await AWSUtils.findExports(cf, ["Export1"]);
            expect(result).to.deep.equal({
                exports: cfExports,
                unFoundExports: []
            });
        });

        it("Tests that an export is found spanning multiple tokens.", async () => {
            const exports1: CloudFormation.Export[] = [{
                Name: "Export1",
                Value: "Value1"
            }, {
                Name: "Export2",
                Value: "Value2"
            }];
            const exports2: CloudFormation.Export[] = [{
                Name: "Export3",
                Value: "Value3"
            }, {
                Name: "Export4",
                Value: "Value4"
            }];
            const exports3: CloudFormation.Export[] = [{
                Name: "Export5",
                Value: "Value5"
            }, {
                Name: "Export6",
                Value: "Value6"
            }];

            setExportsReturns([{
                Exports: exports1,
                NextToken: "ABCD123"
            }, {
                Exports: exports2,
                NextToken: "ABCD123"
            }, {
                Exports: exports3,
                NextToken: "ABCD123"
            }]);

            const result = await AWSUtils.findExports(cf, ["Export1", "Export4", "Export6"]);
            expect(result).to.deep.equal({
                exports: [exports1[0], exports2[1], exports3[1]],
                unFoundExports: []
            });
        });

        it("Tests that items that were not found are reported.", async () => {
            const exports1: CloudFormation.Export[] = [{
                Name: "Export1",
                Value: "Value1"
            }, {
                Name: "Export2",
                Value: "Value2"
            }];
            const exports2: CloudFormation.Export[] = [{
                Name: "Export3",
                Value: "Value3"
            }, {
                Name: "Export4",
                Value: "Value4"
            }];
            const exports3: CloudFormation.Export[] = [{
                Name: "Export5",
                Value: "Value5"
            }, {
                Name: "Export6",
                Value: "Value6"
            }];

            setExportsReturns([{
                Exports: exports1,
                NextToken: "ABCD123"
            }, {
                Exports: exports2,
                NextToken: "ABCD123"
            }, {
                Exports: exports3
            }]);

            const result = await AWSUtils.findExports(cf, ["Export7", "Export8", "Export9"]);
            expect(result).to.deep.equal({
                exports: [],
                unFoundExports: ["Export7", "Export8", "Export9"]
            });
        });
    });
});