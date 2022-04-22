import * as API from "../api.js"
import { ok, the } from "./util.js"

/**
 * @returns {API.AccessProvider}
 */
export const create = () => new AccessProvider()

/**
 * Define model as a map from access did to account did. If accounts merge
 * new account joint account is created as a parent of acconst merged, which is
 * why there may be multiple levels to be considered.
 *
 *
 * @typedef {Map<API.DID, {account:API.DID, proof:API.Link}>} Model
 * @implements {API.AccessProvider}
 */
class AccessProvider {
  /**
   * @param {Model} [model]
   */
  constructor(model = new Map()) {
    this.model = model
  }
  /**
   * @param {API.DID} from
   * @param {API.DID} to
   * @param {API.Link} proof
   */
  async register(from, to, proof) {
    return /** @type {{ok:true, value:undefined}} */ (
      associate(this.model, from, to, proof, true)
    )
  }
  /**
   * @param {API.DID} from
   * @param {API.DID} to
   * @param {API.Link} proof
   */
  async link(from, to, proof) {
    return associate(this.model, from, to, proof, false)
  }

  /**
   * @param {API.DID} member
   * @param {API.DID} group
   * @param {API.Link} proof
   */
  async unlink(member, group, proof) {
    return unlink(this.model, member, group, proof)
  }

  /**
   * @param {API.DID} member
   */
  async resolve(member) {
    return resolve(this.model, member)
  }
}

/**
 * @param {Model} model
 * @param {API.DID} member
 * @param {API.DID} group
 * @param {API.Link} proof
 */
const unlink = (model, member, group, proof) => {
  if (model.has(group)) {
    const account = resolve(model, group)
    // if member belongs to the same account as a group we can remove
    if (account === resolve(model, member)) {
      model.delete(member)
    }
    return ok()
  } else {
    return new UnknownDIDError()
  }
}

/**
 * @param {Model} accounts
 * @param {API.DID} from
 * @param {API.DID} to
 * @param {API.Link} proof
 * @param {boolean} create
 */
const associate = (accounts, from, to, proof, create) => {
  const fromAccount = resolve(accounts, from)
  const toAccount = resolve(accounts, to)
  // So it could be that no did is linked with an account, one of the dids is
  // linked with an account or both dids are linked with accounts. If no did
  // is linked we just create a new account and link both did's with it. If
  // one of the dids is linked with the account we link other with the same
  // account if both are linked to a differnt accounts we create new joint
  // account and link all them together.
  if (!fromAccount && !toAccount) {
    if (create) {
      const account = the(`did:cid:${proof}`)
      accounts.set(to, { account, proof })
      accounts.set(from, { account, proof })
    } else {
      return new UnknownDIDError()
    }
  } else if (toAccount) {
    accounts.set(from, { account: toAccount, proof })
  } else if (fromAccount) {
    accounts.set(to, { account: fromAccount, proof })
  } else if (fromAccount !== toAccount) {
    const account = the(`did:cid:${proof}`)
    accounts.set(toAccount, { account, proof })
    accounts.set(fromAccount, { account, proof })
  }

  return ok()
}

/**
 * Resolves memeber account. If member is not linked with any account returns
 * `null` otherwise returns DID of the account which will have a
 * `did:ipld:bafy...hash` form.
 *
 * @param {Model} accounts
 * @param {API.DID} member
 * @returns {API.DID|null}
 */
const resolve = (accounts, member) => {
  let group = accounts.get(member)
  while (group) {
    const parent = accounts.get(group.account)
    if (parent) {
      group = parent
    } else {
      return group.account
    }
  }
  return null
}

export class UnknownDIDError extends Error {
  get name() {
    return the("UnknownDIDError")
  }
}
