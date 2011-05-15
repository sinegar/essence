package com.b88m.essence.confluence;

import java.util.Date;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

import com.ibm.icu.text.SimpleDateFormat;

@XmlRootElement(name = "essence")
@XmlAccessorType(XmlAccessType.FIELD)
public class Document {

	private static final String FORMAT = "yyyy-MM-dd HH:mm";
	@XmlElement
	String id;

	@XmlElement
	String space;

	@XmlElement
	String title;

	@XmlElement
	String lastModified;
	@XmlElement
	String lastModifiedBy;

	@XmlElement
	String content;

	public Document(Long id, String space, String title, Date lastModified,
			String lastModifiedBy, String content) {
		this.id = String.valueOf(id);
		this.space = space;
		this.title = title;
		this.lastModified = new SimpleDateFormat(FORMAT).format(lastModified);
		this.lastModifiedBy = lastModifiedBy;
		this.content = content;
	}

}
