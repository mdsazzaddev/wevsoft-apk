import React from 'react';
import { parseProductSpecs } from './utils';

interface ProductSpecificationsProps {
  product: any;
}

export default function ProductSpecifications({ product }: ProductSpecificationsProps) {
  if (!product) return null;

  const specs = [];

  if (product.brand) specs.push({ label: 'Brand', value: product.brand });
  if (product.condition) specs.push({ label: 'Condition', value: product.condition });
  if (product.sku) specs.push({ label: 'SKU', value: product.sku });
  if (product.subcategory) specs.push({ label: 'Subcategory', value: product.subcategory });
  if (product.originCountry) specs.push({ label: 'Country of Origin', value: product.originCountry });
  if (product.warranty) specs.push({ label: 'Warranty', value: product.warranty });
  if (product.returnPolicy) specs.push({ label: 'Return Policy', value: product.returnPolicy });
  if (product.shippingInfo) specs.push({ label: 'Shipping Info', value: product.shippingInfo });

  const grouped = parseProductSpecs(product);

  let variants: any = null;
  if (product.variantsJson) {
    try {
      variants = typeof product.variantsJson === 'string' 
        ? JSON.parse(product.variantsJson) 
        : product.variantsJson;
    } catch (e) {
      console.error("Failed to parse variants", e);
    }
  }

  return (
    <div className="w-full rounded-xl border border-border overflow-hidden bg-card text-foreground">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="text-lg font-semibold">Specifications</h3>
      </div>
      <div className="flex flex-col">
        {specs.length > 0 ? (
          specs.map((spec, index) => (
            <div 
              key={spec.label} 
              className={`flex flex-col sm:flex-row py-3 px-4 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/50'}`}
            >
              <span className="w-full sm:w-1/3 text-muted-foreground font-medium text-sm mb-1 sm:mb-0">
                {spec.label}
              </span>
              <span className="w-full sm:w-2/3 text-sm font-medium">
                {spec.value}
              </span>
            </div>
          ))
        ) : (
          !variants && grouped.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No general specifications available for this product.
            </div>
          )
        )}

        {grouped.map((group) => (
          <div key={group.group} className="border-t border-border">
            <div className="py-2 px-4 bg-muted/30">
              <span className="text-sm font-semibold text-muted-foreground">{group.group}</span>
            </div>
            {group.items.map((spec, index) => (
              <div
                key={`${group.group}-${spec.key}`}
                className={`flex flex-col sm:flex-row py-3 px-4 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/50'}`}
              >
                <span className="w-full sm:w-1/3 text-muted-foreground font-medium text-sm mb-1 sm:mb-0">
                  {spec.label}
                </span>
                <span className="w-full sm:w-2/3 text-sm font-medium">{spec.value}</span>
              </div>
            ))}
          </div>
        ))}
        
        {variants && (
          <div className="border-t border-border mt-1">
            <div className="py-2 px-4 bg-muted/30">
              <span className="text-sm font-semibold text-muted-foreground">Available Options</span>
            </div>
            {Array.isArray(variants) ? (
               variants.map((v: any, index) => (
                <div 
                  key={index}
                  className={`flex flex-col sm:flex-row py-3 px-4 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/50'}`}
                >
                  <span className="w-full sm:w-1/3 text-muted-foreground font-medium text-sm mb-1 sm:mb-0">
                    {v.name || `Option ${index + 1}`}
                  </span>
                  <span className="w-full sm:w-2/3 text-sm font-medium">
                    {Array.isArray(v.options) ? v.options.join(', ') : (v.value || 'Yes')}
                  </span>
                </div>
               ))
            ) : typeof variants === 'object' ? (
              Object.entries(variants).map(([key, val], index) => (
                <div 
                  key={key}
                  className={`flex flex-col sm:flex-row py-3 px-4 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/50'}`}
                >
                  <span className="w-full sm:w-1/3 text-muted-foreground font-medium text-sm mb-1 sm:mb-0 capitalize">
                    {key}
                  </span>
                  <span className="w-full sm:w-2/3 text-sm font-medium">
                    {Array.isArray(val) ? val.join(', ') : String(val)}
                  </span>
                </div>
              ))
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
