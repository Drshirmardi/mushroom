import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GuidanceSafety } from './policy-acceptance';
describe('optional ready-service safety display',()=>{
  const empty={intendedAudience:'',limitations:'',contraindications:[],seekProfessionalCare:''};
  it('does not render an empty safety box',()=>{
    expect(renderToStaticMarkup(createElement(GuidanceSafety,{safety:empty}))).toBe('');
  });
  it('shows available warnings and leaves absent fields out',()=>{
    const html=renderToStaticMarkup(createElement(GuidanceSafety,{safety:{...empty,contraindications:['بارداری']}}));
    expect(html).toContain('بارداری');expect(html).not.toContain('<p></p>');
  });
});
