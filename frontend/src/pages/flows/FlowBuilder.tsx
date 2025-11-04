import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { flowService, Flow } from '../../services/flowService';
import { templateService, StationTemplate, CheckTemplate } from '../../services/templateService';
// Button import removed - not needed with FlowHeader component
import TemplatePalette from '../../components/flows/TemplatePalette';
import TemplateNode from '../../components/flows/TemplateNode';
import NodeProperties from '../../components/flows/NodeProperties';
import FlowHeader from '../../components/flows/FlowHeader';

const nodeTypes = {
  template: TemplateNode,
};

export default function FlowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  const [stationTemplates, setStationTemplates] = useState<StationTemplate[]>([]);
  const [checkTemplates, setCheckTemplates] = useState<CheckTemplate[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
    if (id && id !== 'new') {
      loadFlow(id);
    } else {
      initializeNewFlow();
    }
  }, [id]);

  const loadTemplates = async () => {
    try {
      const [stations, checks] = await Promise.all([
        templateService.getStationTemplates(),
        templateService.getCheckTemplates(),
      ]);
      setStationTemplates(stations);
      setCheckTemplates(checks);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadFlow = async (flowId: string) => {
    setIsLoading(true);
    try {
      const data = await flowService.getFlow(flowId);
      setFlow(data);
      convertFlowToNodes(data);
    } catch (error) {
      console.error('Failed to load flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeNewFlow = () => {
    setFlow({
      _id: 'new',
      flow_id: `flow_${Date.now()}`,
      version: '1.0',
      name: 'New Flow',
      pipeline: 'gold',
      status: 'draft',
      nodes: [],
      edges: [],
      created_by: '',
      effective_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsLoading(false);
  };

  const convertFlowToNodes = (flowData: Flow) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Convert flow nodes to ReactFlow nodes
    flowData.nodes.forEach((node) => {
      const template = 
        node.type === 'station'
          ? stationTemplates.find(t => t.template_id === node.template_id)
          : checkTemplates.find(t => t.template_id === node.template_id);

      if (template) {
        newNodes.push({
          id: node.id,
          type: 'template',
          position: node.position,
          data: {
            type: node.type,
            template: template,
            onSelect: () => {
              const selectedNode = newNodes.find(n => n.id === node.id);
              if (selectedNode) setSelectedNode(selectedNode);
            },
          },
        });
      }
    });

    // Convert flow edges to ReactFlow edges
    flowData.edges.forEach((edge) => {
      newEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const templateData = JSON.parse(event.dataTransfer.getData('application/reactflow'));

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: 'template',
        position,
        data: {
          type: templateData.type,
          template: templateData.template,
          onSelect: () => {
            const node = nodes.find(n => n.id === newNode.id);
            if (node) setSelectedNode(node);
          },
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data } : node
      )
    );
  }, [setNodes]);

  const saveFlow = async () => {
    if (!flow) return;

    // Convert ReactFlow nodes to Flow nodes
    const flowNodes = nodes.map((node) => ({
      id: node.id,
      type: node.data.type,
      template_id: node.data.template.template_id,
      position: node.position,
      selectedSops: node.data.selectedSops || [],
    }));

    // Convert ReactFlow edges to Flow edges
    const flowEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    setIsSaving(true);
    try {
      if (id === 'new') {
        const created = await flowService.createFlow({
          flow_id: flow.flow_id,
          version: flow.version,
          name: flow.name,
          pipeline: flow.pipeline,
          nodes: flowNodes,
          edges: flowEdges,
          effective_date: flow.effective_date,
        });
        navigate(`/flows/builder/${created._id}`);
        alert('Flow created successfully!');
      } else if (id) {
        const updated = await flowService.updateFlow(id, {
          name: flow.name,
          pipeline: flow.pipeline,
          nodes: flowNodes,
          edges: flowEdges,
        });
        setFlow(updated);
        alert('Flow saved successfully!');
      }
    } catch (error: any) {
      console.error('Failed to save flow:', error);
      let message = 'Failed to save flow. Please try again.';
      
      if (error.response?.status === 403) {
        message = '⚠️ Permission denied. Only admins can create and edit flows. Please login as an admin.';
      } else if (error.response?.status === 400) {
        message = error.response?.data?.error || 'Invalid flow data. Only draft flows can be edited.';
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      }
      
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const activateFlow = async () => {
    if (!flow || !flow._id || flow._id === 'new') {
      alert('Please save the flow first before activating.');
      return;
    }

    const statusText = flow.status === 'archived' ? 're-activate' : 'activate';
    const message = `Are you sure you want to ${statusText} this flow?\n\n` +
      `This will:\n` +
      `• Archive any currently active flows for the ${flow.pipeline.toUpperCase()} pipeline\n` +
      `• Make this flow the active workflow for all batches\n` +
      `• Take effect immediately for operators`;

    if (!confirm(message)) {
      return;
    }

    try {
      await flowService.activateFlow(flow._id);
      alert(`Flow ${statusText}d successfully!`);
      navigate('/flows');
    } catch (error) {
      console.error('Failed to activate flow:', error);
      alert('Failed to activate flow. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading flow...</p>
        </div>
      </div>
    );
  }

  if (!flow) {
    return <div>Error loading flow</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <FlowHeader
        flow={flow}
        onUpdateFlow={setFlow}
        onSave={saveFlow}
        onActivate={activateFlow}
        onBack={() => navigate('/flows')}
        isSaving={isSaving}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Palette */}
        <TemplatePalette
          stationTemplates={stationTemplates}
          checkTemplates={checkTemplates}
        />

        {/* Center Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} />
            <Controls />
          </ReactFlow>

          {/* Instructions Overlay (when empty) */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-white p-8 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Start Building Your Flow
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag stations and checks from the left palette onto the canvas
                </p>
                <p className="text-sm text-gray-500">
                  Then connect them by dragging from one node to another
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Properties Panel */}
        {selectedNode && (
          <NodeProperties
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onDelete={deleteSelectedNode}
            onUpdate={updateNodeData}
          />
        )}
      </div>
    </div>
  );
}
