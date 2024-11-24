import {
  KIND_TEXT as LEGACY_KIND_TEXT,
  ACTION_MOUNT as LEGACY_ACTION_MOUNT,
  ACTION_INSERT_CHILD as LEGACY_ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD as LEGACY_ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS as LEGACY_ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT as LEGACY_ACTION_UPDATE_TEXT,
  KIND_FRAGMENT as LEGACY_KIND_FRAGMENT,
  KIND_COMPONENT as LEGACY_KIND_COMPONENT,
  type RemoteChannel as LegacyRemoteChannel,
  type ActionArgumentMap as LegacyActionArgumentMap,
  type RemoteComponentSerialization as LegacyRemoteComponentSerialization,
  type RemoteFragmentSerialization as LegacyRemoteFragmentSerialization,
  type RemoteTextSerialization as LegacyRemoteTextSerialization,
  isRemoteFragment as isLegacyRemoteFragment,
} from '@remote-ui/core';
import type {
  RemoteConnection,
  RemoteMutationRecord,
  RemoteTextSerialization,
  RemoteElementSerialization,
} from '@remote-dom/core';
import {
  ROOT_ID,
  NODE_TYPE_TEXT,
  NODE_TYPE_ELEMENT,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
} from '@remote-dom/core';

export interface LegacyRemoteChannelElementMap {
  [key: string]: string;
}

export interface LegacyRemoteChannelOptions {
  elements?: LegacyRemoteChannelElementMap;
  slotName?: string;
}

type LegacyRemoteNode =
  | LegacyRemoteComponentSerialization
  | LegacyRemoteTextSerialization
  | LegacyRemoteFragmentSerialization;

interface NormalizedNode {
  id: string;
  children: NormalizedNode[];
  props: Record<string, unknown>;
  slot?: string;
  type?: string;
  kind?: number;
  text?: string;
}

class NodeManager {
  nodes = new Map<string, NormalizedNode>();

  attachNode(node: LegacyRemoteNode, slot?: string) {
    const existingNode = this.nodes.get(node.id);
    if (existingNode) {
      return existingNode;
    }

    const normalizedNode: NormalizedNode = {
      id: node.id,
      slot,
      kind: node.kind,
      props: 'props' in node ? {...node.props} : {},
      children:
        'children' in node
          ? node.children?.map((child) => this.attachNode(child))
          : [],
      text: 'text' in node ? node.text : undefined,
      type: 'type' in node ? node.type : undefined,
    };
    this.nodes.set(node.id, normalizedNode);

    return normalizedNode;
  }

  getFragmentNodeForProp(nodeId: string, propName: string) {
    const node = this.getNode(nodeId);
    return node.children.find((child) => child.slot === propName);
  }

  insertChildAtIndex(
    parentNodeId: string,
    child:
      | LegacyRemoteComponentSerialization
      | LegacyRemoteTextSerialization
      | LegacyRemoteFragmentSerialization,
    index: number,
    slot?: string,
  ) {
    const parentNode = this.nodes.get(parentNodeId);
    if (!parentNode) {
      throw new Error('Parent node not found');
    }

    const node = this.attachNode(child, slot);

    if ('children' in parentNode && Array.isArray(parentNode.children)) {
      parentNode.children.splice(index, 0, node);
    }
    return node;
  }

  removeChildAtIndex(parentNodeId: string, index: number) {
    const parentNode = this.nodes.get(parentNodeId);
    if (!parentNode) {
      return;
    }

    const child = parentNode.children?.[index];
    this.#removeNodeAndChildren(child);

    parentNode.children.splice(index, 1);
  }

  getNode(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error('Node not found');
    }
    return node;
  }

  #removeNodeAndChildren(normalizedNode: NormalizedNode) {
    if (
      'children' in normalizedNode &&
      Array.isArray(normalizedNode.children)
    ) {
      for (const child of normalizedNode.children) {
        this.#removeNodeAndChildren(child);
      }
    }

    this.nodes.delete(normalizedNode.id);
  }
}

class RemoteUiAdapter {
  #nodeManager: NodeManager;

  constructor() {
    this.#nodeManager = new NodeManager();
  }

  #addSlotPropsAsChildrenToNode(normalizedNode: NormalizedNode) {
    for (const [key, value] of Object.entries(normalizedNode.props || {})) {
      if (isLegacyRemoteFragment(value)) {
        const normalizedFragmentNode = this.#nodeManager.attachNode(value, key);

        normalizedNode.children.push(normalizedFragmentNode);
        this.#addSlotPropsAsChildrenToNode(normalizedFragmentNode);
        delete normalizedNode.props[key];
      }
    }
    normalizedNode.children.forEach((child) => {
      return this.#addSlotPropsAsChildrenToNode(child);
    });
    return normalizedNode;
  }

  #adaptLegacyNodeSerialization(
    child:
      | LegacyRemoteComponentSerialization
      | LegacyRemoteTextSerialization
      | LegacyRemoteFragmentSerialization,
    options?: LegacyRemoteChannelOptions,
  ): RemoteElementSerialization | RemoteTextSerialization {
    switch (child.kind) {
      case LEGACY_KIND_TEXT:
        return this.#adaptLegacyTextSerialization(child);
      case LEGACY_KIND_FRAGMENT:
        return this.#adaptLegacyFragmentSerialization(child, options);
      default:
        return this.#adaptLegacyComponentSerialization(child, options);
    }
  }

  #adaptLegacyTextSerialization({
    id,
    text,
  }: LegacyRemoteTextSerialization): RemoteTextSerialization {
    return {
      id,
      type: NODE_TYPE_TEXT,
      data: text,
    };
  }

  #adaptLegacyComponentSerialization(
    {id, type, props = {}, children}: LegacyRemoteComponentSerialization,
    options?: LegacyRemoteChannelOptions,
  ): RemoteElementSerialization {
    const element = options?.elements?.[type] ?? type;

    return {
      id,
      type: NODE_TYPE_ELEMENT,
      element,
      properties: props,
      children: children?.map((child) => {
        return this.#adaptLegacyNodeSerialization(child, options);
      }),
    };
  }

  #adaptLegacyFragmentSerialization(
    node: LegacyRemoteComponentSerialization,
    options?: LegacyRemoteChannelOptions,
  ): RemoteElementSerialization {
    const {id, props = {}, children, slot} = node;
    return {
      id,
      type: NODE_TYPE_ELEMENT,
      element: 'remote-fragment',
      properties: props,
      children: children?.map((child) => {
        return this.#adaptLegacyNodeSerialization(child, options);
      }),
      attributes: {slot},
    };
  }

  adaptToLegacyRemoteChannel(
    connection: RemoteConnection,
    options?: LegacyRemoteChannelOptions,
  ): LegacyRemoteChannel {
    return <T extends keyof LegacyActionArgumentMap>(
      type: T,
      ...payload: LegacyActionArgumentMap[T]
    ) => {
      console.log('### type', type, payload);
      switch (type) {
        case LEGACY_ACTION_MOUNT: {
          const [nodes] =
            payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_MOUNT];

          const normalizedRootNode = this.#nodeManager.attachNode({
            id: ROOT_ID,
            children: nodes,
            kind: LEGACY_KIND_COMPONENT,
            props: {},
            type: 'root',
          } satisfies LegacyRemoteComponentSerialization);

          this.#addSlotPropsAsChildrenToNode(normalizedRootNode);

          const records: RemoteMutationRecord[] = [];
          normalizedRootNode.children.forEach((node, index) => {
            records.push([
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              this.#adaptLegacyNodeSerialization(node, options),
              index,
            ]);
          });

          connection.mutate(records);
          break;
        }

        case LEGACY_ACTION_INSERT_CHILD: {
          const [parentId, index, child] =
            payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_INSERT_CHILD];

          const actualParentId = parentId ?? ROOT_ID;

          const normalizedChild = this.#nodeManager.insertChildAtIndex(
            actualParentId,
            child,
            index,
          );
          this.#addSlotPropsAsChildrenToNode(normalizedChild);

          connection.mutate([
            [
              MUTATION_TYPE_INSERT_CHILD,
              actualParentId,
              this.#adaptLegacyNodeSerialization(normalizedChild, options),
              index,
            ],
          ]);

          break;
        }

        case LEGACY_ACTION_REMOVE_CHILD: {
          const [parentId, removeIndex] =
            payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_REMOVE_CHILD];

          const actualParentId = parentId ?? ROOT_ID;

          this.#nodeManager.removeChildAtIndex(actualParentId, removeIndex);

          connection.mutate([
            [MUTATION_TYPE_REMOVE_CHILD, actualParentId, removeIndex],
          ]);

          break;
        }

        case LEGACY_ACTION_UPDATE_TEXT: {
          const [textId, text] =
            payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_TEXT];

          connection.mutate([[MUTATION_TYPE_UPDATE_TEXT, textId, text]]);
          break;
        }

        case LEGACY_ACTION_UPDATE_PROPS: {
          const [id, props] =
            payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_PROPS];

          const additionalChildrenRecords: RemoteMutationRecord[] = [];

          for (const [key, value] of Object.entries(props)) {
            if (isLegacyRemoteFragment(value)) {
              const fragmentNode = this.#nodeManager.getFragmentNodeForProp(
                id,
                key,
              );
              if (!fragmentNode) {
                const nodeToInsertTo = this.#nodeManager.getNode(id);
                const indexToInsertAt = nodeToInsertTo?.children.length ?? 0;

                const normalizedFragmentNode =
                  this.#nodeManager.insertChildAtIndex(
                    nodeToInsertTo.id,
                    value,
                    indexToInsertAt,
                    key,
                  );

                normalizedFragmentNode.children =
                  normalizedFragmentNode.children.map((child) => {
                    return this.#addSlotPropsAsChildrenToNode(child);
                  });

                additionalChildrenRecords.push([
                  MUTATION_TYPE_INSERT_CHILD,
                  id,
                  this.#adaptLegacyNodeSerialization(
                    normalizedFragmentNode,
                    options,
                  ),
                  indexToInsertAt,
                ]);
              } else {
                this.#nodeManager.removeChildAtIndex(fragmentNode.id, 0);
                const normalizedFragmentNode =
                  this.#nodeManager.insertChildAtIndex(
                    fragmentNode.id,
                    value.children[0],
                    0,
                  );

                additionalChildrenRecords.push([
                  MUTATION_TYPE_REMOVE_CHILD,
                  fragmentNode.id,
                  0,
                ]);

                additionalChildrenRecords.push([
                  MUTATION_TYPE_INSERT_CHILD,
                  fragmentNode.id,
                  this.#adaptLegacyNodeSerialization(
                    normalizedFragmentNode,
                    options,
                  ),
                  0,
                ]);
              }

              // TODO: if they already had that fragment before, do we need to update it when the id if the node is different?

              delete props[key];
            } else {
              const nodeToRemoveFrom = this.#nodeManager.getNode(id);

              const slotChildIndex = nodeToRemoveFrom.children.findIndex(
                (child) => child.slot === key,
              );

              if (slotChildIndex !== -1) {
                this.#nodeManager.removeChildAtIndex(id, slotChildIndex);
                additionalChildrenRecords.push([
                  MUTATION_TYPE_REMOVE_CHILD,
                  id,
                  slotChildIndex,
                ]);
              }
            }
          }

          const propRecords = Object.entries(props).map(
            ([key, value]) =>
              [
                MUTATION_TYPE_UPDATE_PROPERTY,
                id,
                key,
                value,
              ] satisfies RemoteMutationRecord,
          );

          connection.mutate([...propRecords, ...additionalChildrenRecords]);
          break;
        }

        default:
          throw new Error(`Unsupported action type: ${type}`);
      }
    };
  }
}

export function adaptToLegacyRemoteChannel(
  connection: RemoteConnection,
  options?: LegacyRemoteChannelOptions,
) {
  return new RemoteUiAdapter().adaptToLegacyRemoteChannel(connection, options);
}
