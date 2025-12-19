import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'systeme/1.0.0 (api/6.1.3)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * Retrieves the collection of Community resources.
   *
   * @summary Retrieves the collection of Community resources.
   */
  api_communitycommunities_get_collection(metadata?: types.ApiCommunitycommunitiesGetCollectionMetadataParam): Promise<FetchResponse<200, types.ApiCommunitycommunitiesGetCollectionResponse200>> {
    return this.core.fetch('/api/community/communities', 'get', metadata);
  }

  /**
   * Creates a Membership resource.
   *
   * @summary Creates a Membership resource.
   */
  api_communitycommunities_communityIdmemberships_post(body: types.ApiCommunitycommunitiesCommunityIdmembershipsPostBodyParam, metadata: types.ApiCommunitycommunitiesCommunityIdmembershipsPostMetadataParam): Promise<FetchResponse<202, types.ApiCommunitycommunitiesCommunityIdmembershipsPostResponse202>> {
    return this.core.fetch('/api/community/communities/{communityId}/memberships', 'post', body, metadata);
  }

  /**
   * Retrieves the collection of Membership resources.
   *
   * @summary Retrieves the collection of Membership resources.
   */
  api_communitymemberships_get_collection(metadata?: types.ApiCommunitymembershipsGetCollectionMetadataParam): Promise<FetchResponse<200, types.ApiCommunitymembershipsGetCollectionResponse200>> {
    return this.core.fetch('/api/community/memberships', 'get', metadata);
  }

  /**
   * Removes the Membership resource.
   *
   * @summary Removes the Membership resource.
   */
  api_communitymemberships_id_delete(metadata: types.ApiCommunitymembershipsIdDeleteMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/community/memberships/{id}', 'delete', metadata);
  }

  /**
   * Retrieves the collection of ContactField resources.
   *
   * @summary Retrieves the collection of ContactField resources.
   */
  api_contact_fields_get_collection(): Promise<FetchResponse<200, types.ApiContactFieldsGetCollectionResponse200>> {
    return this.core.fetch('/api/contact_fields', 'get');
  }

  /**
   * Creates a ContactField resource.
   *
   * @summary Creates a ContactField resource.
   */
  api_contact_fields_post(body: types.ApiContactFieldsPostBodyParam): Promise<FetchResponse<201, types.ApiContactFieldsPostResponse201>> {
    return this.core.fetch('/api/contact_fields', 'post', body);
  }

  /**
   * Removes the ContactField resource.
   *
   * @summary Removes the ContactField resource.
   */
  api_contact_fields_slug_delete(metadata: types.ApiContactFieldsSlugDeleteMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/contact_fields/{slug}', 'delete', metadata);
  }

  /**
   * Updates the ContactField resource.
   *
   * @summary Updates the ContactField resource.
   */
  api_contact_fields_slug_patch(body: types.ApiContactFieldsSlugPatchBodyParam, metadata: types.ApiContactFieldsSlugPatchMetadataParam): Promise<FetchResponse<200, types.ApiContactFieldsSlugPatchResponse200>> {
    return this.core.fetch('/api/contact_fields/{slug}', 'patch', body, metadata);
  }

  /**
   * Retrieves the collection of Contact resources.
   *
   * @summary Retrieves the collection of Contact resources.
   */
  api_contacts_get_collection(metadata?: types.ApiContactsGetCollectionMetadataParam): Promise<FetchResponse<200, types.ApiContactsGetCollectionResponse200>> {
    return this.core.fetch('/api/contacts', 'get', metadata);
  }

  /**
   * Contacts are not immediately removed upon deletion. For security reasons, the actual
   * deletion of contact data may take several days. If you add a new contact using the same
   * email address as a recently deleted one, the new contact might inherit certain
   * properties from the previously deleted contact.
   *
   * @summary Creates a Contact resource.
   * @throws FetchError<422, types.PostContactResponse422> Unprocessable entity
   */
  post_contact(body: types.PostContactBodyParam): Promise<FetchResponse<201, types.PostContactResponse201>> {
    return this.core.fetch('/api/contacts', 'post', body);
  }

  /**
   * Retrieves a Contact resource.
   *
   * @summary Retrieves a Contact resource.
   */
  api_contacts_id_get(metadata: types.ApiContactsIdGetMetadataParam): Promise<FetchResponse<200, types.ApiContactsIdGetResponse200>> {
    return this.core.fetch('/api/contacts/{id}', 'get', metadata);
  }

  /**
   * Removes the Contact resource.
   *
   * @summary Removes the Contact resource.
   */
  delete_contact(metadata: types.DeleteContactMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/contacts/{id}', 'delete', metadata);
  }

  /**
   * Updates the Contact resource.
   *
   * @summary Updates the Contact resource.
   * @throws FetchError<422, types.ApiContactsIdPatchResponse422> Unprocessable entity
   */
  api_contacts_id_patch(body: types.ApiContactsIdPatchBodyParam, metadata: types.ApiContactsIdPatchMetadataParam): Promise<FetchResponse<200, types.ApiContactsIdPatchResponse200>> {
    return this.core.fetch('/api/contacts/{id}', 'patch', body, metadata);
  }

  /**
   * Assigns a Tag to a Contact.
   *
   * @summary Assigns a Tag to a Contact.
   */
  post_contact_tag(body: types.PostContactTagBodyParam, metadata: types.PostContactTagMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/contacts/{id}/tags', 'post', body, metadata);
  }

  /**
   * Removes a Tag from a Contact.
   *
   * @summary Removes a Tag from a Contact.
   */
  delete_contact_tag(metadata: types.DeleteContactTagMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/contacts/{id}/tags/{tagId}', 'delete', metadata);
  }

  /**
   * Retrieves the collection of Subscription resources.
   *
   * @summary Retrieves the collection of Subscription resources.
   */
  api_paymentsubscriptions_get_collection(metadata: types.ApiPaymentsubscriptionsGetCollectionMetadataParam): Promise<FetchResponse<200, types.ApiPaymentsubscriptionsGetCollectionResponse200>> {
    return this.core.fetch('/api/payment/subscriptions', 'get', metadata);
  }

  /**
   * Cancels the subscription.
   *
   * @summary Unsubscribe.
   */
  cancel_subscription(body: types.CancelSubscriptionBodyParam, metadata: types.CancelSubscriptionMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/payment/subscriptions/{id}/cancel', 'post', body, metadata);
  }

  /**
   * Retrieves the collection of Course resources.
   *
   * @summary Retrieves the collection of Course resources.
   */
  api_schoolcourses_get_collection(metadata?: types.ApiSchoolcoursesGetCollectionMetadataParam): Promise<FetchResponse<200, types.ApiSchoolcoursesGetCollectionResponse200>> {
    return this.core.fetch('/api/school/courses', 'get', metadata);
  }

  /**
   * Creates an Enrollment resource.
   *
   * @summary Creates an Enrollment resource.
   */
  api_schoolcourses_courseIdenrollments_post(body: types.ApiSchoolcoursesCourseIdenrollmentsPostBodyParam, metadata: types.ApiSchoolcoursesCourseIdenrollmentsPostMetadataParam): Promise<FetchResponse<201, types.ApiSchoolcoursesCourseIdenrollmentsPostResponse201>> {
    return this.core.fetch('/api/school/courses/{courseId}/enrollments', 'post', body, metadata);
  }

  /**
   * Retrieves the collection of Enrollment resources.
   *
   * @summary Retrieves the collection of Enrollment resources.
   */
  api_schoolenrollments_get_collection(metadata?: types.ApiSchoolenrollmentsGetCollectionMetadataParam): Promise<FetchResponse<200, types.ApiSchoolenrollmentsGetCollectionResponse200>> {
    return this.core.fetch('/api/school/enrollments', 'get', metadata);
  }

  /**
   * Removes the Enrollment resource.
   *
   * @summary Removes the Enrollment resource.
   */
  api_schoolenrollments_id_delete(metadata: types.ApiSchoolenrollmentsIdDeleteMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/school/enrollments/{id}', 'delete', metadata);
  }

  /**
   * Retrieves the collection of Tag resources.
   *
   * @summary Retrieves the collection of Tag resources.
   */
  api_tags_get_collection(metadata?: types.ApiTagsGetCollectionMetadataParam): Promise<FetchResponse<200, types.ApiTagsGetCollectionResponse200>> {
    return this.core.fetch('/api/tags', 'get', metadata);
  }

  /**
   * Creates a Tag resource.
   *
   * @summary Creates a Tag resource.
   * @throws FetchError<422, types.ApiTagsPostResponse422> Unprocessable entity
   */
  api_tags_post(body: types.ApiTagsPostBodyParam): Promise<FetchResponse<201, types.ApiTagsPostResponse201>> {
    return this.core.fetch('/api/tags', 'post', body);
  }

  /**
   * Retrieves a Tag resource.
   *
   * @summary Retrieves a Tag resource.
   */
  api_tags_id_get(metadata: types.ApiTagsIdGetMetadataParam): Promise<FetchResponse<200, types.ApiTagsIdGetResponse200>> {
    return this.core.fetch('/api/tags/{id}', 'get', metadata);
  }

  /**
   * Replaces the Tag resource.
   *
   * @summary Replaces the Tag resource.
   * @throws FetchError<422, types.ApiTagsIdPutResponse422> Unprocessable entity
   */
  api_tags_id_put(body: types.ApiTagsIdPutBodyParam, metadata: types.ApiTagsIdPutMetadataParam): Promise<FetchResponse<200, types.ApiTagsIdPutResponse200>> {
    return this.core.fetch('/api/tags/{id}', 'put', body, metadata);
  }

  /**
   * Removes the Tag resource.
   *
   * @summary Removes the Tag resource.
   */
  api_tags_id_delete(metadata: types.ApiTagsIdDeleteMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/tags/{id}', 'delete', metadata);
  }

  /**
   * Retrieves the collection of Webhook resources.
   *
   * @summary Retrieves the collection of Webhook resources.
   */
  api_webhooks_get_collection(): Promise<FetchResponse<200, types.ApiWebhooksGetCollectionResponse200>> {
    return this.core.fetch('/api/webhooks', 'get');
  }

  /**
   * Creates a Webhook resource.
   *
   * @summary Creates a Webhook resource.
   */
  api_webhooks_post(body: types.ApiWebhooksPostBodyParam): Promise<FetchResponse<201, types.ApiWebhooksPostResponse201>> {
    return this.core.fetch('/api/webhooks', 'post', body);
  }

  /**
   * Retrieves a Webhook resource.
   *
   * @summary Retrieves a Webhook resource.
   */
  api_webhooks_id_get(metadata: types.ApiWebhooksIdGetMetadataParam): Promise<FetchResponse<200, types.ApiWebhooksIdGetResponse200>> {
    return this.core.fetch('/api/webhooks/{id}', 'get', metadata);
  }

  /**
   * Removes the Webhook resource.
   *
   * @summary Removes the Webhook resource.
   */
  api_webhooks_id_delete(metadata: types.ApiWebhooksIdDeleteMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/api/webhooks/{id}', 'delete', metadata);
  }

  /**
   * Updates the Webhook resource.
   *
   * @summary Updates the Webhook resource.
   */
  api_webhooks_id_patch(body: types.ApiWebhooksIdPatchBodyParam, metadata: types.ApiWebhooksIdPatchMetadataParam): Promise<FetchResponse<200, types.ApiWebhooksIdPatchResponse200>> {
    return this.core.fetch('/api/webhooks/{id}', 'patch', body, metadata);
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { ApiCommunitycommunitiesCommunityIdmembershipsPostBodyParam, ApiCommunitycommunitiesCommunityIdmembershipsPostMetadataParam, ApiCommunitycommunitiesCommunityIdmembershipsPostResponse202, ApiCommunitycommunitiesGetCollectionMetadataParam, ApiCommunitycommunitiesGetCollectionResponse200, ApiCommunitymembershipsGetCollectionMetadataParam, ApiCommunitymembershipsGetCollectionResponse200, ApiCommunitymembershipsIdDeleteMetadataParam, ApiContactFieldsGetCollectionResponse200, ApiContactFieldsPostBodyParam, ApiContactFieldsPostResponse201, ApiContactFieldsSlugDeleteMetadataParam, ApiContactFieldsSlugPatchBodyParam, ApiContactFieldsSlugPatchMetadataParam, ApiContactFieldsSlugPatchResponse200, ApiContactsGetCollectionMetadataParam, ApiContactsGetCollectionResponse200, ApiContactsIdGetMetadataParam, ApiContactsIdGetResponse200, ApiContactsIdPatchBodyParam, ApiContactsIdPatchMetadataParam, ApiContactsIdPatchResponse200, ApiContactsIdPatchResponse422, ApiPaymentsubscriptionsGetCollectionMetadataParam, ApiPaymentsubscriptionsGetCollectionResponse200, ApiSchoolcoursesCourseIdenrollmentsPostBodyParam, ApiSchoolcoursesCourseIdenrollmentsPostMetadataParam, ApiSchoolcoursesCourseIdenrollmentsPostResponse201, ApiSchoolcoursesGetCollectionMetadataParam, ApiSchoolcoursesGetCollectionResponse200, ApiSchoolenrollmentsGetCollectionMetadataParam, ApiSchoolenrollmentsGetCollectionResponse200, ApiSchoolenrollmentsIdDeleteMetadataParam, ApiTagsGetCollectionMetadataParam, ApiTagsGetCollectionResponse200, ApiTagsIdDeleteMetadataParam, ApiTagsIdGetMetadataParam, ApiTagsIdGetResponse200, ApiTagsIdPutBodyParam, ApiTagsIdPutMetadataParam, ApiTagsIdPutResponse200, ApiTagsIdPutResponse422, ApiTagsPostBodyParam, ApiTagsPostResponse201, ApiTagsPostResponse422, ApiWebhooksGetCollectionResponse200, ApiWebhooksIdDeleteMetadataParam, ApiWebhooksIdGetMetadataParam, ApiWebhooksIdGetResponse200, ApiWebhooksIdPatchBodyParam, ApiWebhooksIdPatchMetadataParam, ApiWebhooksIdPatchResponse200, ApiWebhooksPostBodyParam, ApiWebhooksPostResponse201, CancelSubscriptionBodyParam, CancelSubscriptionMetadataParam, DeleteContactMetadataParam, DeleteContactTagMetadataParam, PostContactBodyParam, PostContactResponse201, PostContactResponse422, PostContactTagBodyParam, PostContactTagMetadataParam } from './types';
