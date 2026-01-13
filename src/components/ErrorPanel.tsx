import React from 'react';
import { AlertTriangle, X, ChevronDown, ChevronRight, ExternalLink, AlertCircle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useStore } from '../store';
import type { ValidationError } from '../types/validation';

/**
 * Error panel component for displaying detailed validation issues
 */
export const ErrorPanel: React.FC = () => {
  const {
    validationErrors,
    showErrorPanel,
    setShowErrorPanel,
    clearValidationErrors,
    organization,
  } = useStore();

  const [expandedErrors, setExpandedErrors] = React.useState<Set<number>>(new Set());

  if (!showErrorPanel) {
    return null;
  }

  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const getErrorIcon = (error: ValidationError) => {
    switch (error.type) {
      case 'ACCOUNT_LIMIT_EXCEEDED':
      case 'OU_LIMIT_EXCEEDED':
      case 'NESTING_LIMIT_EXCEEDED':
      case 'POLICY_LIMIT_EXCEEDED':
      case 'POLICY_SIZE_EXCEEDED':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'DEFAULT_POLICY_PROTECTION':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'INVALID_POLICY_JSON':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getErrorSeverity = (error: ValidationError): 'high' | 'medium' | 'low' => {
    switch (error.type) {
      case 'ACCOUNT_LIMIT_EXCEEDED':
      case 'OU_LIMIT_EXCEEDED':
      case 'INVALID_POLICY_JSON':
        return 'high';
      case 'NESTING_LIMIT_EXCEEDED':
      case 'POLICY_LIMIT_EXCEEDED':
      case 'POLICY_SIZE_EXCEEDED':
        return 'medium';
      case 'DEFAULT_POLICY_PROTECTION':
        return 'low';
      default:
        return 'medium';
    }
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800';
    }
  };

  const getNodeName = (nodeId: string) => {
    if (!organization || !organization.nodes[nodeId]) {
      return nodeId;
    }
    return organization.nodes[nodeId].name;
  };

  const getSuggestedActions = (error: ValidationError): string[] => {
    switch (error.type) {
      case 'ACCOUNT_LIMIT_EXCEEDED':
        return [
          'Remove unused accounts from the organization',
          'Request a limit increase from AWS Support',
          'Consider consolidating accounts if possible',
        ];
      case 'OU_LIMIT_EXCEEDED':
        return [
          'Remove unused organizational units',
          'Consolidate similar OUs to reduce the total count',
          'Request a limit increase from AWS Support',
        ];
      case 'NESTING_LIMIT_EXCEEDED':
        return [
          'Flatten the organizational structure',
          'Move deeply nested OUs to higher levels',
          'Consider a different organizational design',
        ];
      case 'POLICY_LIMIT_EXCEEDED':
        return [
          'Remove unused policies from the node',
          'Consolidate similar policies into a single policy',
          'Consider using policy inheritance instead of direct attachment',
        ];
      case 'POLICY_SIZE_EXCEEDED':
        return [
          'Reduce the policy content size',
          'Split large policies into smaller, focused policies',
          'Remove unnecessary statements or conditions',
        ];
      case 'INVALID_POLICY_JSON':
        return [
          'Check the JSON syntax for errors',
          'Validate the policy structure against AWS documentation',
          'Use a JSON validator to identify syntax issues',
        ];
      case 'DEFAULT_POLICY_PROTECTION':
        return [
          'Default policies cannot be removed from the root node',
          'Attach at least one RCP to the node',
          'Ensure all nodes have the required minimum policies',
        ];
      default:
        return ['Review the error details and take appropriate action'];
    }
  };

  const errorsByType = validationErrors.reduce((acc, error, index) => {
    if (!acc[error.type]) {
      acc[error.type] = [];
    }
    acc[error.type].push({ error, index });
    return acc;
  }, {} as Record<string, Array<{ error: ValidationError; index: number }>>);

  const errorTypeLabels = {
    ACCOUNT_LIMIT_EXCEEDED: 'Account Limits',
    OU_LIMIT_EXCEEDED: 'Organizational Unit Limits',
    NESTING_LIMIT_EXCEEDED: 'Nesting Limits',
    POLICY_LIMIT_EXCEEDED: 'Policy Limits',
    POLICY_SIZE_EXCEEDED: 'Policy Size',
    INVALID_POLICY_JSON: 'Invalid Policy Format',
    DEFAULT_POLICY_PROTECTION: 'Default Policy Protection',
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-lg z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950/50">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-red-900 dark:text-red-300 truncate">
            <span className="hidden sm:inline">Validation Issues</span>
            <span className="sm:hidden">Issues</span>
          </h2>
          <Badge variant="destructive" className="ml-2 flex-shrink-0">
            {validationErrors.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowErrorPanel(false)}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex-shrink-0"
          aria-label="Close error panel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {validationErrors.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No validation issues found.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Your organization structure is compliant with AWS limits.
            </p>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm">Issue Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-red-600 dark:text-red-400">
                      {validationErrors.filter(e => getErrorSeverity(e) === 'high').length}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">High</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-orange-600 dark:text-orange-400">
                      {validationErrors.filter(e => getErrorSeverity(e) === 'medium').length}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                      {validationErrors.filter(e => getErrorSeverity(e) === 'low').length}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Low</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Errors by type */}
            {Object.entries(errorsByType).map(([type, errors]) => (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getErrorIcon(errors[0].error)}
                    {errorTypeLabels[type as keyof typeof errorTypeLabels] || type}
                    <Badge variant="outline" className="ml-auto">
                      {errors.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {errors.map(({ error, index }) => (
                    <div key={index} className="border rounded-lg p-2 sm:p-3 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                            <Badge 
                              className={`text-xs ${getSeverityColor(getErrorSeverity(error))}`}
                            >
                              {getErrorSeverity(error).toUpperCase()}
                            </Badge>
                            {error.nodeId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                onClick={() => console.log('Navigate to node:', error.nodeId)}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                <span className="truncate max-w-20 sm:max-w-none">
                                  {getNodeName(error.nodeId)}
                                </span>
                              </Button>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {error.message}
                          </p>
                          
                          {/* Expandable details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleErrorExpansion(index)}
                          >
                            {expandedErrors.has(index) ? (
                              <ChevronDown className="w-3 h-3 mr-1" />
                            ) : (
                              <ChevronRight className="w-3 h-3 mr-1" />
                            )}
                            {expandedErrors.has(index) ? 'Hide' : 'Show'} Details
                          </Button>
                          
                          {expandedErrors.has(index) && (
                            <div className="mt-2 p-2 bg-white dark:bg-gray-950 rounded border text-xs">
                              {error.currentCount !== undefined && error.maxAllowed !== undefined && (
                                <div className="mb-2">
                                  <strong>Current:</strong> {error.currentCount} / {error.maxAllowed}
                                </div>
                              )}
                              
                              <div className="mb-2">
                                <strong>Suggested Actions:</strong>
                                <ul className="list-disc list-inside mt-1 space-y-1 text-gray-600 dark:text-gray-400">
                                  {getSuggestedActions(error).map((action, actionIndex) => (
                                    <li key={actionIndex}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {validationErrors.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
          <Button
            variant="outline"
            size="sm"
            onClick={clearValidationErrors}
            className="w-full"
          >
            Clear All Issues
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            <span className="hidden sm:inline">Issues will be automatically updated as you make changes</span>
            <span className="sm:hidden">Auto-updated on changes</span>
          </p>
        </div>
      )}
    </div>
  );
};