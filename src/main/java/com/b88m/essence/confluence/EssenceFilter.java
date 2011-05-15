package com.b88m.essence.confluence;

import static com.atlassian.core.util.ClassLoaderUtils.getResource;
import static com.atlassian.core.util.ClassLoaderUtils.getResourceAsStream;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;

import com.atlassian.confluence.labels.LabelManager;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.extras.common.log.Logger;
import com.atlassian.extras.common.log.Logger.Log;
import com.atlassian.spring.filter.FlushingSpringSessionInViewFilter;
import com.atlassian.user.User;

/**
 * This filter is the hart of essence full with dirty hacks to make it work for
 * v1.
 * 
 * This filter handles all requests to /e/*, ensures authentication (required by
 * rest APIs) and opens the Hibernate session.
 * 
 * 
 * @deprecated This is a temporary workaround until better solution is found.
 */
public class EssenceFilter extends FlushingSpringSessionInViewFilter implements
		FilterChain {

	private final Log log = Logger.getInstance(EssenceFilter.class);
	// TODO remove label manager
	private final LabelManager labelManager;

	public EssenceFilter(LabelManager labelManager) {
		this.labelManager = labelManager;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request,
			HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		// the essence.mf shouldn't go to authenticate
		// but normally it should fly throw without any change
		// because its URL already has the auth required paramaters
		if (!processAuthenticaion(request, response)) {
			// TODO this is really dirty but a quick workaround to ensure
			// hibernate session
			super.doFilterInternal(request, response, this);
		}
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response)
			throws IOException, ServletException {

		// no check for cast was already done by super
		HttpServletRequest httpRequest = (HttpServletRequest) request;
		HttpServletResponse httpResponse = (HttpServletResponse) response;

		String uri = httpRequest.getRequestURI().substring(
				httpRequest.getContextPath().length() + 3);

		log.debug(">>>>> " + uri + "|" + httpRequest.getQueryString());

		if ("essence.mf".equals(uri)) {
			writeManifest(httpResponse);
		} else {
			if ("".equals(uri)) {
				// goto default page
				handle("essence.html", httpResponse);
			} else if (uri.startsWith("data/")) {
				// forward to REST API
				forward(uri, httpRequest, httpResponse);
			} else {
				// goto requested resource
				handle(uri, httpResponse);
			}
		}

	}

	private void forward(String uri, HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
		String path = "/rest/essence/1.0/" + uri;

		log.debug("forward " + uri + " to " + path);

		request.getRequestDispatcher(path).forward(request, response);
	}

	private void handle(String uri, HttpServletResponse response)
			throws IOException {
		String resource = "www/" + uri;

		log.debug("loading " + uri + " from "
				+ getResource(resource, getClass()));

		IOUtils.copy(getResourceAsStream(resource, getClass()), response
				.getOutputStream());
	}

	private void writeManifest(HttpServletResponse response) throws IOException {
		response.setContentType("text/cache-manifest");
		response.getOutputStream().print(
				"CACHE MANIFEST\n" + "#v1.0.0\n" + "zepto.js\n"
						+ "underscore.js\n" + "backbone.js\n" + "essence.js\n"
						+ "essence.css\n" + '#' + sign() + '\n'
						+ "data/favourites\n" + "offline.png\n" + "NETWORK:\n"
						+ "data/document\n" + "CACHE:\n" + "FALLBACK:\n"
						+ "online.png offline.png\n");

	}

	private String sign() {
		// return the current data signature
		// at the moment only checks for number of favourites
		return "length: "
				+ labelManager.getCurrentContentForLabel(
						labelManager.getLabel("my:favourite")).size();
	}

	// return true if response processed
	private boolean processAuthenticaion(HttpServletRequest request,
			HttpServletResponse response) throws IOException {
		boolean done = false;
		// TODO workaround to login the user
		User user = AuthenticatedUserThreadLocal.getUser();
		if (user == null) {
			log.debug(">>>>> force authentication");
			response.sendRedirect(request.getContextPath()
					+ "/e/?os_authType=basic");
			done = true;
		} else if (request.getRequestURI().endsWith("/e/")
				&& "basic".equals(request.getParameter("os_authType"))) {
			log.debug(">>>>> remove os_authType");
			response.sendRedirect(request.getContextPath() + "/e/");
			done = true;
		}
		return done;
	}

	@Override
	public void destroy() {
	}

}
