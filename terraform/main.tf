// -------------------------------
// Provider
// -------------------------------
provider "azurerm" {
  features {}
  subscription_id                  = "8727b601-d44d-45cd-ad84-f7ae5ec18ebf"
  tenant_id                        = "54342f99-51ac-459d-9efd-5966459147c3"
  resource_provider_registrations  = "none"
}

// -------------------------------
// Resource Group
// -------------------------------
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

// -------------------------------
// Azure Container Registry (ACR)
// -------------------------------
resource "azurerm_container_registry" "acr" {
  name                = var.acr_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Basic"
  admin_enabled       = false  # Disabled since we're using managed identity
}

// -------------------------------
// App Service Plan
// -------------------------------
resource "azurerm_service_plan" "plan" {
  name                = var.app_service_plan_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = "B1"
  os_type             = "Linux"
}

// -------------------------------
// Application Insights
// -------------------------------
resource "azurerm_application_insights" "ai" {
  name                = "${var.app_name}-ai"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"
}

// -------------------------------
// App Service (Backend Container)
// -------------------------------
resource "azurerm_linux_web_app" "app" {
  name                = var.app_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    application_stack {
      docker_image_name   = "${var.image_name}:${var.image_tag}"
      docker_registry_url = "https://${azurerm_container_registry.acr.login_server}"
    }
    
    # Enable detailed logging for troubleshooting
    http2_enabled       = true
    minimum_tls_version = "1.2"
    always_on           = true
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
    "APPINSIGHTS_INSTRUMENTATIONKEY"      = azurerm_application_insights.ai.instrumentation_key
    "DOCKER_ENABLE_CI"                    = "true"
    "WEBSITES_PORT"                       = "3000"
    "PORT"                                = "3000"
    "NODE_ENV"                            = "production"
  }

  identity {
    type = "SystemAssigned"
  }
}

// -------------------------------
// Role Assignment: Grant App Service AcrPull access
// -------------------------------
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.app.identity[0].principal_id
  
  # Skip if already exists (in case of re-runs)
  skip_service_principal_aad_check = true
}