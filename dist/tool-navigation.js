const manager=document.getElementById('attribute-workspace'),monitor=document.getElementById('survey-monitor');
const buttons=[...document.querySelectorAll('[data-workspace]')];
for(const button of buttons)button.addEventListener('click',()=>{const survey=button.dataset.workspace==='survey';manager.hidden=survey;monitor.hidden=!survey;for(const item of buttons)item.setAttribute('aria-selected',String(item===button));document.getElementById('workspace-heading').textContent=survey?'Survey Quality Monitor':'Attribute Manager';});
