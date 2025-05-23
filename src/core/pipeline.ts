/**
 * Data Pipeline - Data processing, cleaning, and transformation
 * 
 * Manages the complete data processing pipeline from raw scraped data
 * to clean, validated, and aggregated datasets. Provides data quality
 * assessment, transformation rules, validation, and export capabilities.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ExtractedData,
  ProcessedData,
  AggregatedData,
  DataTransformation,
  DataQuality,
  QualityIssue,
  CleaningRule,
  CleaningCondition,
  ExportJob,
  ExportStatus,
  ExportMetadata,
  DataStatistics,
  FieldInfo,
  FieldStatistics,
  DataSchema,
  SchemaField,
  ValidationRule
} from '../types/data.js';
import { OutputFormat, QualityMetrics } from '../types/config.js';

export class DataPipeline {
  private processingQueue: Map<string, ProcessingJob> = new Map();
  private exportJobs: Map<string, ExportJob> = new Map();
  private transformationRegistry: Map<string, TransformationFunction> = new Map();
  private validationRegistry: Map<string, ValidationFunction> = new Map();

  constructor() {
    this.initializeBuiltInTransformations();
    this.initializeBuiltInValidators();
  }

  /**
   * Process raw data through the cleaning and transformation pipeline
   */
  async processData(
    sessionId: string,
    rawData: ExtractedData[],
    cleaningRules: CleaningRule[] = [],
    validationRules: ValidationRule[] = []
  ): Promise<ProcessedData[]> {
    const jobId = uuidv4();
    const job: ProcessingJob = {
      id: jobId,
      sessionId,
      status: 'running',
      progress: 0,
      totalRecords: rawData.length,
      processedRecords: 0,
      startTime: new Date(),
      errors: []
    };

    this.processingQueue.set(jobId, job);

    try {
      const processedData: ProcessedData[] = [];

      for (let i = 0; i < rawData.length; i++) {
        const raw = rawData[i];
        
        try {
          // Apply cleaning rules
          let cleaned = { ...raw.raw };
          const transformations: DataTransformation[] = [];

          for (const rule of cleaningRules) {
            if (this.matchesConditions(cleaned, rule.conditions || [])) {
              const transformation = await this.applyCleaningRule(cleaned, rule);
              if (transformation) {
                transformations.push(transformation);
                cleaned = { ...cleaned, [rule.field]: transformation.after };
              }
            }
          }

          // Validate data
          const quality = this.assessDataQuality(cleaned, validationRules);

          // Create processed data record
          const processed: ProcessedData = {
            id: uuidv4(),
            originalId: raw.id,
            processed: cleaned,
            transformations,
            quality,
            timestamp: new Date()
          };

          processedData.push(processed);
          job.processedRecords++;
          job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Processing failed';
          job.errors.push({
            recordId: raw.id,
            error: errorMessage,
            timestamp: new Date()
          });
        }
      }

      job.status = 'completed';
      job.endTime = new Date();
      
      return processedData;

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.errors.push({
        recordId: 'pipeline',
        error: error instanceof Error ? error.message : 'Pipeline failed',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Aggregate processed data using specified rules
   */
  async aggregateData(
    processedData: ProcessedData[],
    aggregationRules: AggregationRule[]
  ): Promise<AggregatedData[]> {
    const aggregatedResults: AggregatedData[] = [];

    // Group data for aggregation
    const groups = this.groupDataForAggregation(processedData, aggregationRules);

    for (const [groupKey, records] of groups.entries()) {
      const aggregated: Record<string, any> = {};

      for (const rule of aggregationRules) {
        const values = records.map((r: ProcessedData) => this.extractFieldValue(r.processed, rule.fields[0]));
        aggregated[rule.fields[0]] = this.applyAggregation(values, rule.operation, rule.parameters);
      }

      const aggregatedData: AggregatedData = {
        id: uuidv4(),
        sourceIds: records.map((r: ProcessedData) => r.id),
        aggregated,
        aggregationRules,
        timestamp: new Date()
      };

      aggregatedResults.push(aggregatedData);
    }

    return aggregatedResults;
  }

  /**
   * Generate comprehensive data statistics
   */
  generateDataStatistics(data: ProcessedData[]): DataStatistics {
    const stats: DataStatistics = {
      recordCount: data.length,
      fieldCount: 0,
      duplicateRecords: 0,
      completenessRatio: 0,
      qualityScore: 0,
      processingTime: 0,
      dataSize: 0,
      distribution: {}
    };

    if (data.length === 0) return stats;

    // Analyze fields
    const fieldMap = new Map<string, FieldInfo>();
    let totalQualityScore = 0;
    let totalSize = 0;

    for (const record of data) {
      totalQualityScore += this.calculateOverallQuality(record.quality);
      totalSize += JSON.stringify(record.processed).length;

      // Analyze each field
      for (const [fieldName, value] of Object.entries(record.processed)) {
        if (!fieldMap.has(fieldName)) {
          fieldMap.set(fieldName, {
            name: fieldName,
            type: this.inferFieldType(value),
            count: 0,
            uniqueValues: 0,
            nullCount: 0,
            sampleValues: [],
            statistics: undefined
          });
        }

        const fieldInfo = fieldMap.get(fieldName)!;
        fieldInfo.count++;
        
        if (value === null || value === undefined || value === '') {
          fieldInfo.nullCount++;
        } else if (fieldInfo.sampleValues.length < 10) {
          fieldInfo.sampleValues.push(value);
        }
      }
    }

    // Calculate field statistics
    for (const fieldInfo of fieldMap.values()) {
      if (this.isNumericField(fieldInfo.type)) {
        fieldInfo.statistics = this.calculateNumericStatistics(
          data.map(d => d.processed[fieldInfo.name]).filter(v => v !== null && v !== undefined)
        );
      }
    }

    // Detect duplicates
    const uniqueRecords = new Set(data.map(d => JSON.stringify(d.processed)));
    stats.duplicateRecords = data.length - uniqueRecords.size;

    // Calculate completeness ratio
    const totalFields = Array.from(fieldMap.values()).reduce((sum, field) => sum + field.count, 0);
    const nonNullFields = Array.from(fieldMap.values()).reduce((sum, field) => sum + (field.count - field.nullCount), 0);
    stats.completenessRatio = totalFields > 0 ? nonNullFields / totalFields : 0;

    stats.fieldCount = fieldMap.size;
    stats.qualityScore = data.length > 0 ? totalQualityScore / data.length : 0;
    stats.dataSize = totalSize;

    return stats;
  }

  /**
   * Infer data schema from processed data
   */
  inferDataSchema(data: ProcessedData[]): DataSchema {
    const fieldMap = new Map<string, SchemaField>();

    for (const record of data) {
      for (const [fieldName, value] of Object.entries(record.processed)) {
        if (!fieldMap.has(fieldName)) {
          fieldMap.set(fieldName, {
            name: fieldName,
            type: this.inferFieldType(value),
            required: false,
            description: `Auto-inferred field: ${fieldName}`,
            validation: []
          });
        }

        const field = fieldMap.get(fieldName)!;
        
        // Update type if more specific type found
        const currentType = this.inferFieldType(value);
        if (this.isMoreSpecificType(currentType, field.type)) {
          field.type = currentType;
        }
      }
    }

    // Determine required fields (present in >90% of records)
    for (const field of fieldMap.values()) {
      const presence = data.filter(d => 
        d.processed[field.name] !== null && 
        d.processed[field.name] !== undefined && 
        d.processed[field.name] !== ''
      ).length;
      
      field.required = (presence / data.length) > 0.9;
    }

    return {
      version: '1.0.0',
      fields: Array.from(fieldMap.values())
    };
  }

  /**
   * Export data to specified format
   */
  async exportData(
    sessionId: string,
    data: ProcessedData[] | AggregatedData[],
    format: OutputFormat,
    filename: string,
    filePath?: string,
    metadata?: Partial<ExportMetadata>
  ): Promise<ExportJob> {
    const job: ExportJob = {
      id: uuidv4(),
      sessionId,
      format,
      filename,
      filePath,
      status: 'pending',
      progress: 0,
      created: new Date(),
      recordCount: data.length,
      metadata: {
        includeHeaders: true,
        encoding: 'utf-8',
        ...metadata
      }
    };

    this.exportJobs.set(job.id, job);

    // Start export asynchronously
    this.performExport(job, data).catch(error => {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Export failed';
      job.completed = new Date();
    });

    return job;
  }

  /**
   * Get processing job status
   */
  getProcessingJob(jobId: string): ProcessingJob | undefined {
    return this.processingQueue.get(jobId);
  }

  /**
   * Get export job status
   */
  getExportJob(jobId: string): ExportJob | undefined {
    return this.exportJobs.get(jobId);
  }

  /**
   * Clean up completed jobs
   */
  cleanupJobs(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up processing jobs
    for (const [jobId, job] of this.processingQueue.entries()) {
      if (job.endTime && (now - job.endTime.getTime()) > maxAge) {
        this.processingQueue.delete(jobId);
      }
    }

    // Clean up export jobs
    for (const [jobId, job] of this.exportJobs.entries()) {
      if (job.completed && (now - job.completed.getTime()) > maxAge) {
        this.exportJobs.delete(jobId);
      }
    }
  }

  private async applyCleaningRule(
    data: Record<string, any>,
    rule: CleaningRule
  ): Promise<DataTransformation | null> {
    const fieldValue = data[rule.field];
    const before = fieldValue;
    let after = fieldValue;
    let success = true;
    let error: string | undefined;

    try {
      switch (rule.operation) {
        case 'trim':
          after = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
          break;

        case 'normalize':
          after = this.normalizeValue(fieldValue, rule.parameters);
          break;

        case 'format':
          after = this.formatValue(fieldValue, rule.parameters);
          break;

        case 'validate':
          const isValid = this.validateValue(fieldValue, rule.parameters);
          if (!isValid) {
            success = false;
            error = `Validation failed for field ${rule.field}`;
          }
          break;

        case 'transform':
          if (rule.parameters.transformer && this.transformationRegistry.has(rule.parameters.transformer)) {
            const transformer = this.transformationRegistry.get(rule.parameters.transformer)!;
            after = transformer(fieldValue, rule.parameters);
          }
          break;

        case 'filter':
          // Filter operations don't change the value but mark records for exclusion
          break;

        case 'replace':
          if (typeof fieldValue === 'string' && rule.parameters.pattern && rule.parameters.replacement) {
            after = fieldValue.replace(new RegExp(rule.parameters.pattern, 'g'), rule.parameters.replacement);
          }
          break;

        default:
          success = false;
          error = `Unknown operation: ${rule.operation}`;
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Transformation failed';
    }

    return {
      field: rule.field,
      operation: rule.operation,
      parameters: rule.parameters,
      before,
      after,
      success,
      error
    };
  }

  private assessDataQuality(
    data: Record<string, any>,
    validationRules: ValidationRule[]
  ): DataQuality {
    const issues: QualityIssue[] = [];
    const fieldCount = Object.keys(data).length;
    let completedFields = 0;
    let accurateFields = 0;
    let consistentFields = 0;

    for (const [field, value] of Object.entries(data)) {
      // Check completeness
      if (value !== null && value !== undefined && value !== '') {
        completedFields++;
      } else {
        issues.push({
          type: 'missing',
          field,
          description: `Field ${field} is missing or empty`,
          severity: 'medium'
        });
      }

      // Apply validation rules
      const fieldRules = validationRules.filter(rule => 
        !rule.validator || rule.validator === field
      );

      for (const rule of fieldRules) {
        const isValid = this.validateFieldValue(value, rule);
        if (isValid) {
          accurateFields++;
        } else {
          issues.push({
            type: 'invalid',
            field,
            description: rule.message || `Field ${field} failed validation`,
            severity: 'high'
          });
        }
      }

      // Check consistency (basic type consistency)
      if (this.isValueConsistent(value)) {
        consistentFields++;
      } else {
        issues.push({
          type: 'inconsistent',
          field,
          description: `Field ${field} has inconsistent format`,
          severity: 'low'
        });
      }
    }

    return {
      completeness: fieldCount > 0 ? completedFields / fieldCount : 0,
      accuracy: fieldCount > 0 ? accurateFields / fieldCount : 0,
      consistency: fieldCount > 0 ? consistentFields / fieldCount : 0,
      timeliness: 1.0, // Assume all data is fresh for now
      issues
    };
  }

  private matchesConditions(
    data: Record<string, any>,
    conditions: CleaningCondition[]
  ): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = data[condition.field];
      let matches = false;

      switch (condition.operator) {
        case 'equals':
          matches = fieldValue === condition.value;
          break;
        case 'contains':
          matches = typeof fieldValue === 'string' && fieldValue.includes(condition.value);
          break;
        case 'startsWith':
          matches = typeof fieldValue === 'string' && fieldValue.startsWith(condition.value);
          break;
        case 'endsWith':
          matches = typeof fieldValue === 'string' && fieldValue.endsWith(condition.value);
          break;
        case 'matches':
          matches = typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
          break;
        case 'gt':
          matches = typeof fieldValue === 'number' && fieldValue > condition.value;
          break;
        case 'lt':
          matches = typeof fieldValue === 'number' && fieldValue < condition.value;
          break;
        case 'between':
          matches = typeof fieldValue === 'number' && 
                   fieldValue >= condition.value[0] && 
                   fieldValue <= condition.value[1];
          break;
      }

      if (condition.negate) matches = !matches;
      if (!matches) return false;
    }

    return true;
  }

  private initializeBuiltInTransformations(): void {
    this.transformationRegistry.set('uppercase', (value) => 
      typeof value === 'string' ? value.toUpperCase() : value
    );

    this.transformationRegistry.set('lowercase', (value) => 
      typeof value === 'string' ? value.toLowerCase() : value
    );

    this.transformationRegistry.set('trim', (value) => 
      typeof value === 'string' ? value.trim() : value
    );

    this.transformationRegistry.set('removeSpecialChars', (value) => 
      typeof value === 'string' ? value.replace(/[^a-zA-Z0-9\s]/g, '') : value
    );

    this.transformationRegistry.set('parseNumber', (value) => {
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? value : parsed;
      }
      return value;
    });
  }

  private initializeBuiltInValidators(): void {
    this.validationRegistry.set('email', (value) => 
      typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    );

    this.validationRegistry.set('url', (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });

    this.validationRegistry.set('phone', (value) => 
      typeof value === 'string' && /^\+?[\d\s\-\(\)]+$/.test(value)
    );

    this.validationRegistry.set('date', (value) => 
      !isNaN(Date.parse(value))
    );
  }

  private normalizeValue(value: any, parameters: Record<string, any>): any {
    if (typeof value === 'string') {
      if (parameters.case === 'upper') return value.toUpperCase();
      if (parameters.case === 'lower') return value.toLowerCase();
      if (parameters.trim) return value.trim();
    }
    return value;
  }

  private formatValue(value: any, parameters: Record<string, any>): any {
    if (parameters.type === 'date' && value) {
      try {
        const date = new Date(value);
        return parameters.format ? this.formatDate(date, parameters.format) : date.toISOString();
      } catch {
        return value;
      }
    }
    return value;
  }

  private validateValue(value: any, parameters: Record<string, any>): boolean {
    if (parameters.validator && this.validationRegistry.has(parameters.validator)) {
      const validator = this.validationRegistry.get(parameters.validator)!;
      return validator(value);
    }
    return true;
  }

  private validateFieldValue(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'format':
        return rule.validator ? new RegExp(rule.validator).test(value) : true;
      case 'range':
        return typeof value === 'number' && 
               value >= (rule.value as number[])[0] && 
               value <= (rule.value as number[])[1];
      case 'length':
        return typeof value === 'string' && value.length <= (rule.value as number);
      case 'pattern':
        return typeof value === 'string' && new RegExp(rule.validator || '').test(value);
      default:
        return true;
    }
  }

  private calculateOverallQuality(quality: DataQuality): number {
    return (quality.completeness + quality.accuracy + quality.consistency + quality.timeliness) / 4;
  }

  private inferFieldType(value: any): SchemaField['type'] {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    
    if (typeof value === 'string') {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
      if (/^https?:\/\//.test(value)) return 'url';
      if (/^\+?[\d\s\-\(\)]+$/.test(value)) return 'phone';
      if (!isNaN(Date.parse(value))) return 'date';
    }
    
    return 'string';
  }

  private isMoreSpecificType(newType: SchemaField['type'], currentType: SchemaField['type']): boolean {
    const specificity = ['string', 'date', 'phone', 'email', 'url', 'number', 'boolean', 'array', 'object'];
    return specificity.indexOf(newType) > specificity.indexOf(currentType);
  }

  private isNumericField(type: SchemaField['type']): boolean {
    return type === 'number';
  }

  private calculateNumericStatistics(values: number[]): FieldStatistics {
    if (values.length === 0) return {};

    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: mean,
      median: sorted[Math.floor(sorted.length / 2)],
      standardDeviation: Math.sqrt(
        values.reduce((sq, v) => sq + Math.pow(v - mean, 2), 0) / values.length
      )
    };
  }

  private isValueConsistent(value: any): boolean {
    // Basic consistency check - can be enhanced
    return value !== null && value !== undefined;
  }

  private formatDate(date: Date, format: string): string {
    // Simple date formatting - can be enhanced
    return date.toISOString().split('T')[0];
  }

  private async performExport(job: ExportJob, data: any[]): Promise<void> {
    job.status = 'running';
    job.started = new Date();

    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1000));

      job.status = 'completed';
      job.progress = 100;
      job.completed = new Date();
      job.fileSize = JSON.stringify(data).length;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Export failed';
      job.completed = new Date();
    }
  }

  private groupDataForAggregation(
    data: ProcessedData[],
    rules: AggregationRule[]
  ): Map<string, ProcessedData[]> {
    const groups = new Map<string, ProcessedData[]>();
    
    for (const record of data) {
      // Simple grouping by first field in first rule
      const groupKey = rules.length > 0 ? 
        String(this.extractFieldValue(record.processed, rules[0].fields[0])) : 
        'default';
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(record);
    }
    
    return groups;
  }

  private extractFieldValue(data: Record<string, any>, fieldPath: string): any {
    const keys = fieldPath.split('.');
    let value = data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  private applyAggregation(
    values: any[],
    operation: AggregationRule['operation'],
    parameters?: Record<string, any>
  ): any {
    const filteredValues = values.filter(v => v !== null && v !== undefined);
    
    switch (operation) {
      case 'sum':
        return filteredValues.reduce((sum, val) => sum + (Number(val) || 0), 0);
      case 'average':
        return filteredValues.length > 0 ? 
          filteredValues.reduce((sum, val) => sum + (Number(val) || 0), 0) / filteredValues.length : 0;
      case 'min':
        return filteredValues.length > 0 ? Math.min(...filteredValues.map(v => Number(v) || 0)) : null;
      case 'max':
        return filteredValues.length > 0 ? Math.max(...filteredValues.map(v => Number(v) || 0)) : null;
      case 'count':
        return filteredValues.length;
      case 'concat':
        return filteredValues.join(parameters?.separator || ', ');
      case 'first':
        return filteredValues[0] || null;
      case 'last':
        return filteredValues[filteredValues.length - 1] || null;
      case 'merge':
        return filteredValues.reduce((merged, val) => ({ ...merged, ...val }), {});
      default:
        return filteredValues;
    }
  }
}

// Supporting interfaces
interface ProcessingJob {
  id: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{
    recordId: string;
    error: string;
    timestamp: Date;
  }>;
}

interface AggregationRule {
  fields: string[];
  operation: 'merge' | 'sum' | 'average' | 'min' | 'max' | 'count' | 'concat' | 'first' | 'last';
  parameters?: Record<string, any>;
}

type TransformationFunction = (value: any, parameters?: Record<string, any>) => any;
type ValidationFunction = (value: any) => boolean; 