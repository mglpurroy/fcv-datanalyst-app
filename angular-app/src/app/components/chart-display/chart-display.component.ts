/**
 * Chart Display Component
 * Renders matplotlib and plotly charts
 */

import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from '../../models/chat.model';

declare var Plotly: any;

@Component({
  selector: 'app-chart-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <!-- Matplotlib Image -->
      <img 
        *ngIf="chart.type === 'matplotlib'"
        [src]="getImageSrc()"
        alt="Chart"
        class="chart-image">
      
      <!-- Plotly Chart -->
      <div 
        *ngIf="chart.type === 'plotly'"
        #plotlyDiv
        class="plotly-chart">
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      margin: 12px 0;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .chart-image {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }

    .plotly-chart {
      width: 100%;
      min-height: 400px;
    }
  `]
})
export class ChartDisplayComponent implements OnInit {
  @Input() chart!: Chart;
  @ViewChild('plotlyDiv') plotlyDiv?: ElementRef;

  ngOnInit(): void {
    if (this.chart.type === 'plotly') {
      // Delay to ensure DOM is ready
      setTimeout(() => this.renderPlotly(), 100);
    }
  }

  getImageSrc(): string {
    return `data:image/png;base64,${this.chart.data}`;
  }

  renderPlotly(): void {
    if (!this.plotlyDiv || typeof Plotly === 'undefined') {
      console.warn('Plotly not loaded or element not ready');
      return;
    }

    try {
      const plotData = JSON.parse(this.chart.data);
      Plotly.newPlot(
        this.plotlyDiv.nativeElement,
        plotData.data,
        plotData.layout,
        { responsive: true }
      );
    } catch (error) {
      console.error('Error rendering Plotly chart:', error);
    }
  }
}
