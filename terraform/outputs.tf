// ================================
// Terraform Outputs
// ================================

output "app_service_url" {
  description = "Full URL of the backend App Service"
  value       = "https://${azurerm_linux_web_app.app.default_hostname}"
}

output "app_service_default_hostname" {
  description = "Hostname of the backend App Service"
  value       = azurerm_linux_web_app.app.default_hostname
}

output "app_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.ai.instrumentation_key
  sensitive   = true
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = azurerm_container_registry.acr.login_server
}

output "app_service_principal_id" {
  description = "Principal ID of the App Service managed identity"
  value       = azurerm_linux_web_app.app.identity[0].principal_id
}

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.rg.name
}