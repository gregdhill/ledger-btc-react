import React, { Component } from "react";
import { BitcoinApi, satToBtc, AccountInfo } from "../bitcoin";
import * as ledger from "../ledger";
import { Row, Col, Table, Button, Jumbotron } from "react-bootstrap";
import CopyToClipboard from "react-copy-to-clipboard";
import { FaClipboard } from "react-icons/fa";

const ENTRIES_PER_PAGE = 3;

interface Props {
  appBtc: ledger.AppBtc;
  apiBtc: BitcoinApi;
  accounts: Map<string, AccountInfo>;
  updateAccount(addr: string, cb: (info: AccountInfo) => AccountInfo): void;
  removeAccountOutputs(addr: string): void;
}

interface State {
  loaded: boolean;
  accIndex: number;
  accounts: Map<string, AccountInfo>;
}

export default class SelectAddresses extends Component<Props, State> {
  state: State = {
    loaded: false,
    accIndex: 0,
    accounts: new Map<string, AccountInfo>(),
  };

  async componentDidMount() {
    const index = this.props.accounts.size;
    this.setState({
      accounts: this.props.accounts,
      accIndex: index,
    });
    if (index === 0) {
      await this.loadAccounts(ENTRIES_PER_PAGE);
    } else {
      this.setState({ loaded: true });
    }
  }

  updateAccount(addr: string, cb: (info: AccountInfo) => AccountInfo): void {
    const { accounts } = this.state;
    const info = cb(
      accounts.get(addr) || { checked: false, index: 0, value: 0 }
    );
    accounts.set(addr, info);
    this.setState({ accounts });
    this.props.updateAccount(addr, () => info);
  }

  async loadAccounts(length: number) {
    const index = this.state.accIndex;
    let promises = [];
    for (let i = index; i < index + length; i++) {
      const addr = await ledger.getWalletAddress(this.props.appBtc, i);
      const accounts = this.state.accounts;
      const info = { checked: false, index: i, value: 0 };
      this.updateAccount(addr, () => info);

      promises.push(
        // address fetching is slow so don't block
        this.props.apiBtc.getAccountValue(addr).then((value) => {
          const accounts = this.state.accounts;
          this.updateAccount(addr, (info) => {
            info.value = value;
            return info;
          });

          this.setState({
            accounts: accounts,
          });
        })
      );

      this.setState({
        accounts: accounts,
      });
    }
    await Promise.all(promises);
    this.setState({
      loaded: true,
      accIndex: index + length,
    });
  }

  onChange(addr: string, e: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = e.target;
    this.updateAccount(addr, (info) => {
      info.checked = checked;
      return info;
    });

    // remove any checked utxos
    if (!checked) {
      this.props.removeAccountOutputs(addr);
    }
  }

  render() {
    return (
      <div>
        <Jumbotron>
          <h1 className="header">Select Addresses</h1>
        </Jumbotron>

        <Row className="justify-content-md-center">
          <Col>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th></th>
                  <th></th>
                  <th>Address</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {[...this.state.accounts].map((acc) => {
                  return (
                    <tr key={acc[0]}>
                      <td>
                        <input
                          type="checkbox"
                          value={acc[0]}
                          onChange={this.onChange.bind(this, acc[0])}
                          checked={acc[1].checked}
                        />
                      </td>
                      <td>
                        <CopyToClipboard text={acc[0]}>
                          <FaClipboard style={{ cursor: "pointer" }} />
                        </CopyToClipboard>
                      </td>
                      <td>{acc[0]}</td>
                      <td>{satToBtc(acc[1].value)} BTC</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Col>
        </Row>
        <Row className="justify-content-md-center">
          {this.state.loaded && (
            <Button
              onClick={() => {
                this.setState({ loaded: false });
                this.loadAccounts(ENTRIES_PER_PAGE);
              }}
            >
              Show More
            </Button>
          )}
        </Row>
      </div>
    );
  }
}
