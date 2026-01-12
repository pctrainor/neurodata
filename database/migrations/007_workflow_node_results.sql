-- Migration: 007_workflow_node_results.sql
-- Description: Create table to store per-node workflow results for developer dashboards and extensibility

CREATE TABLE workflow_node_results (
    id SERIAL PRIMARY KEY,
    workflow_execution_id UUID NOT NULL,
    node_id VARCHAR(64) NOT NULL,
    node_name VARCHAR(128) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by workflow execution
CREATE INDEX idx_workflow_node_results_execution_id ON workflow_node_results(workflow_execution_id);

-- Index for fast lookup by node
CREATE INDEX idx_workflow_node_results_node_id ON workflow_node_results(node_id);
