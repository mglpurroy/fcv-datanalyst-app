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
      <div class="chart-header">
        <span class="chart-title">Chart</span>
        <button 
          type="button" 
          class="btn-download-chart" 
          (click)="downloadChart()" 
          title="Download chart">
          📥 Download
        </button>
      </div>
      
      <!-- Matplotlib Image -->
      <img 
        *ngIf="chart.type === 'matplotlib'"
        [src]="getImageSrc()"
        alt="Chart"
        class="chart-image"
        #chartImage>
      
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
      padding: 16px;
      background: var(--chat-surface);
      border-radius: var(--chat-radius-md);
      border: 1px solid var(--chat-border);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      box-shadow: var(--chat-shadow-sm);
      transition: box-shadow 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .chart-container:hover {
      box-shadow: var(--chat-shadow-md);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--chat-border);
    }

    .chart-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--chat-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-family: 'JetBrains Mono', monospace;
    }

    .btn-download-chart {
      padding: 5px 12px;
      font-size: 11.5px;
      background: var(--chat-accent);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-family: 'JetBrains Mono', monospace;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 1px 2px rgba(74, 144, 226, 0.2);
    }

    .btn-download-chart:hover {
      background: var(--chat-accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(74, 144, 226, 0.3);
    }

    .chart-image {
      max-width: 100%;
      width: 100%;
      height: auto;
      border-radius: var(--chat-radius-sm);
      display: block;
      object-fit: contain;
    }

    .plotly-chart {
      width: 100%;
      max-width: 100%;
      min-height: 400px;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .plotly-chart {
        min-height: 300px;
      }
    }
  `]
})
export class ChartDisplayComponent implements OnInit {
  @Input() chart!: Chart;
  @ViewChild('plotlyDiv') plotlyDiv?: ElementRef;
  @ViewChild('chartImage') chartImage?: ElementRef<HTMLImageElement>;

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
      
      // Ensure layout is responsive
      const layout = {
        ...plotData.layout,
        autosize: true,
        width: undefined, // Let Plotly calculate width
        height: undefined, // Let Plotly calculate height
        margin: {
          l: 50,
          r: 50,
          t: 50,
          b: 50,
          ...plotData.layout?.margin
        }
      };
      
      Plotly.newPlot(
        this.plotlyDiv.nativeElement,
        plotData.data,
        layout,
        { 
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d']
        }
      );
      
      // Handle window resize
      window.addEventListener('resize', () => {
        Plotly.Plots.resize(this.plotlyDiv!.nativeElement);
      });
    } catch (error) {
      console.error('Error rendering Plotly chart:', error);
    }
  }

  downloadChart(): void {
    if (this.chart.type === 'matplotlib') {
      // Download matplotlib image
      const img = this.chartImage?.nativeElement;
      if (img) {
        // Create a canvas to download the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx && img.complete) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `chart-${Date.now()}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        } else {
          // Fallback: download base64 directly
          const link = document.createElement('a');
          link.href = this.getImageSrc();
          link.download = `chart-${Date.now()}.png`;
          link.click();
        }
      }
    } else if (this.chart.type === 'plotly' && this.plotlyDiv && typeof Plotly !== 'undefined') {
      // Download Plotly chart as image
      try {
        Plotly.downloadImage(this.plotlyDiv.nativeElement, {
          format: 'png',
          width: 1200,
          height: 800,
          filename: `chart-${Date.now()}`
        });
      } catch (error) {
        console.error('Error downloading Plotly chart:', error);
        // Fallback: try to export as SVG
        try {
          Plotly.downloadImage(this.plotlyDiv.nativeElement, {
            format: 'svg',
            width: 1200,
            height: 800,
            filename: `chart-${Date.now()}`
          });
        } catch (svgError) {
          console.error('Error downloading Plotly chart as SVG:', svgError);
        }
      }
    }
  }
}
