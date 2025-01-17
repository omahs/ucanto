import * as API from '@ucanto/interface'
import { delegate, Delegation } from './delegation.js'
import * as DAG from './dag.js'

/**
 * @template {API.Capability} Capability
 * @param {API.InvocationOptions<Capability>} options
 * @return {API.IssuedInvocationView<Capability>}
 */
export const invoke = options => new IssuedInvocation(options)

/**
 * @template {API.Capability} C
 * @param {object} dag
 * @param {API.UCANBlock<[C]>} dag.root
 * @param {Map<string, API.Block<unknown>>} [dag.blocks]
 * @returns {API.Invocation<C>}
 */
export const create = ({ root, blocks }) => new Invocation(root, blocks)

/**
 * Takes a link of the `root` block and a map of blocks and constructs an
 * `Invocation` from it. If `root` is not included in the provided blocks
 * provided fallback is returned and if not provided than throws an error.
 * If root points to wrong block (that is not an invocation) it will misbehave
 * and likely throw some errors on field access.
 *
 * @template {API.Invocation} Invocation
 * @template [T=undefined]
 * @param {object} dag
 * @param {ReturnType<Invocation['link']>} dag.root
 * @param {Map<string, API.Block>} dag.blocks
 * @param {T} [fallback]
 * @returns {Invocation|T}
 */
export const view = ({ root, blocks }, fallback) => {
  const block = DAG.get(root, blocks, null)
  const view = block
    ? /** @type {Invocation} */ (create({ root: block, blocks }))
    : /** @type {T} */ (fallback)

  return view
}

/**
 * @template {API.Capability} Capability
 * @implements {API.IssuedInvocationView<Capability>}
 * @implements {API.IssuedInvocation<Capability>}
 */
class IssuedInvocation {
  /**
   * @param {API.InvocationOptions<Capability>} data
   */
  constructor({
    issuer,
    audience,
    capability,
    proofs = [],
    expiration,
    lifetimeInSeconds,
    notBefore,
    nonce,
    facts = [],
  }) {
    /** @readonly */
    this.issuer = issuer
    /** @readonly */
    this.audience = audience
    /** @readonly */
    this.proofs = proofs

    /**
     * @readonly
     * @type {[Capability]}
     */
    this.capabilities = [capability]

    this.expiration = expiration
    this.lifetimeInSeconds = lifetimeInSeconds
    this.notBefore = notBefore
    this.nonce = nonce
    this.facts = facts
  }

  delegate() {
    return delegate(this)
  }

  buildIPLDView() {
    return delegate(this)
  }

  /**
   * @template {API.InvocationService<Capability>} Service
   * @param {API.ConnectionView<Service>} connection
   * @returns {Promise<API.InferServiceInvocationReceipt<Capability, Service>>}
   */
  async execute(connection) {
    /** @type {API.ServiceInvocation<Capability, Service>} */
    // @ts-expect-error - Our `API.InvocationService<Capability>` constraint
    // does not seem to be enough to convince TS that `this` is valid
    // `ServiceInvocations<Service>`.
    const invocation = this
    const [result] = await connection.execute(invocation)
    return result
  }
}

/**
 * @template {API.Capability} Capability
 * @implements {API.Invocation<Capability>}
 * @extends {Delegation<[Capability]>}
 */
export class Invocation extends Delegation {}
